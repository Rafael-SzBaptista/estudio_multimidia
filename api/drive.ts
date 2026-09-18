import {
  IMAGES_FOLDER,
  SONGS_FOLDER,
  assertFileInLibrary,
  driveRequest,
  getDriveAccessToken,
  hasDriveServerAuth,
  isAllowedFolder,
  isDriveOwner,
  verifyGoogleUser,
} from "../server/googleDrive";

type VercelReq = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelRes = {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

function header(req: VercelReq, name: string) {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function query(req: VercelReq, name: string) {
  const value = req.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function folderFromKind(kind?: string) {
  if (kind === "songs") return SONGS_FOLDER;
  return IMAGES_FOLDER;
}

async function requireUser(req: VercelReq, res: VercelRes) {
  try {
    return await verifyGoogleUser(header(req, "authorization"));
  } catch {
    res.status(401).json({ error: "Entre com o Google para continuar." });
    return null;
  }
}

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", header(req, "origin") || "*");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.status(204).end();
    return;
  }

  if (!hasDriveServerAuth()) {
    res.status(501).json({ error: "Servidor do Drive não configurado." });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const action = query(req, "action") || "list";
  const writing = (req.method === "POST" && action === "session") || req.method === "DELETE" || action === "delete";
  if (writing && !isDriveOwner(user.email)) {
    res.status(403).json({ error: "Só a conta dona da pasta pode enviar ou excluir." });
    return;
  }

  try {
    if (req.method === "GET" && action === "list") {
      const folderId = query(req, "folderId") || folderFromKind(query(req, "folder"));
      if (!isAllowedFolder(folderId)) {
        res.status(400).json({ error: "Pasta inválida." });
        return;
      }
      const files: unknown[] = [];
      let pageToken = "";
      do {
        const params = new URLSearchParams({
          q: `'${folderId}' in parents and trashed = false`,
          fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink,iconLink)",
          pageSize: "100",
          orderBy: "name",
          supportsAllDrives: "true",
          includeItemsFromAllDrives: "true",
        });
        if (pageToken) params.set("pageToken", pageToken);
        const response = await driveRequest(`files?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());
        const data = (await response.json()) as { files?: unknown[]; nextPageToken?: string };
        files.push(...(data.files ?? []));
        pageToken = data.nextPageToken ?? "";
      } while (pageToken);
      res.status(200).json({ files });
      return;
    }

    if (req.method === "GET" && action === "download") {
      const id = query(req, "id");
      if (!id) {
        res.status(400).json({ error: "Arquivo inválido." });
        return;
      }
      await assertFileInLibrary(id);
      const exportSlides = query(req, "export") === "slides";
      const path = exportSlides
        ? `files/${id}/export?mimeType=${encodeURIComponent("application/vnd.openxmlformats-officedocument.presentationml.presentation")}`
        : `files/${id}?alt=media`;
      const response = await driveRequest(path);
      if (!response.ok) throw new Error(await response.text());
      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
      res.status(200).send(buffer);
      return;
    }

    if (req.method === "POST" && action === "session") {
      const body = (req.body || {}) as { folderId?: string; name?: string; mimeType?: string };
      const folderId = body.folderId || folderFromKind(query(req, "folder"));
      if (!isAllowedFolder(folderId) || !body.name) {
        res.status(400).json({ error: "Pasta ou arquivo inválido." });
        return;
      }
      const token = await getDriveAccessToken();
      const origin = header(req, "origin") || "https://estudio-multimidia.vercel.app";
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink,iconLink",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": body.mimeType || "application/octet-stream",
            Origin: origin,
          },
          body: JSON.stringify({ name: body.name, parents: [folderId] }),
        },
      );
      const location = response.headers.get("location");
      if (!response.ok || !location) throw new Error(await response.text());
      res.status(200).json({ location });
      return;
    }

    if (req.method === "DELETE" || action === "delete") {
      const id = query(req, "id");
      if (!id) {
        res.status(400).json({ error: "Arquivo inválido." });
        return;
      }
      await assertFileInLibrary(id);
      const response = await driveRequest(`files/${id}?supportsAllDrives=true`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      });
      if (!response.ok) throw new Error(await response.text());
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Método não suportado." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no Drive.";
    if (message === "NOT_CONFIGURED") {
      res.status(501).json({ error: "Servidor do Drive não configurado." });
      return;
    }
    if (message === "FORBIDDEN" || message === "NOT_FOUND") {
      res.status(403).json({ error: "Arquivo fora da biblioteca." });
      return;
    }
    res.status(500).json({ error: "Não foi possível concluir no Drive." });
  }
}
