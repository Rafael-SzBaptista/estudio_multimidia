import { createClient } from "@supabase/supabase-js";
import { fileToCoverBlob, imageFilename, srcToBlob } from "./cover";
import type { ImageRepository, LibraryImage } from "./types";

export const SLIDE_IMAGES_TABLE = "slide_images";
export const SLIDE_IMAGES_BUCKET = "slide-images";

type SlideImageRow = {
  id: string;
  name: string;
  path: string;
  created_at: string;
};

function mapRow(row: SlideImageRow, url: string): LibraryImage {
  return {
    id: row.id,
    name: row.name,
    createdAt: Date.parse(row.created_at) || Date.now(),
    url,
    path: row.path,
  };
}

export function createSupabaseImageRepository(url: string, anonKey: string): ImageRepository {
  const supabase = createClient(url, anonKey);

  async function list(): Promise<LibraryImage[]> {
    const { data, error } = await supabase
      .from(SLIDE_IMAGES_TABLE)
      .select("id, name, path, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    return (data as SlideImageRow[]).map((row) => {
      const publicUrl = supabase.storage.from(SLIDE_IMAGES_BUCKET).getPublicUrl(row.path).data.publicUrl;
      return mapRow(row, publicUrl);
    });
  }

  return {
    list,

    async upload(files) {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const id = crypto.randomUUID();
        const path = `${id}.jpg`;
        const blob = await fileToCoverBlob(file);
        const { error: storageError } = await supabase.storage.from(SLIDE_IMAGES_BUCKET).upload(path, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (storageError) throw storageError;

        const { error: rowError } = await supabase.from(SLIDE_IMAGES_TABLE).insert({
          id,
          name: file.name.replace(/\.[^.]+$/, ""),
          path,
        });
        if (rowError) throw rowError;
      }
      return list();
    },

    async download(id) {
      const images = await list();
      const image = images.find((img) => img.id === id);
      if (!image) throw new Error("Imagem não encontrada.");
      return {
        blob: await srcToBlob(image.url),
        filename: imageFilename(image.name),
      };
    },

    async remove(id) {
      const images = await list();
      const image = images.find((img) => img.id === id);
      if (!image) return images;
      await supabase.storage.from(SLIDE_IMAGES_BUCKET).remove([image.path]);
      const { error } = await supabase.from(SLIDE_IMAGES_TABLE).delete().eq("id", id);
      if (error) throw error;
      return list();
    },
  };
}
