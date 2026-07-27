import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { TYPES, HYPER_RARE_TYPE } from "@/lib/gameConstants";

const ALL_TYPES = [...TYPES, HYPER_RARE_TYPE];

export default function CardBackgroundManager() {
  const [backgrounds, setBackgrounds] = useState([]);
  const [uploadingType, setUploadingType] = useState(null);

  const load = async () => setBackgrounds(await base44.entities.TypeBackground.list());
  useEffect(() => {
    load();
  }, []);

  const getBg = (type) => backgrounds.find((b) => b.type === type);

  const handleUpload = async (type, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingType(type);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existing = getBg(type);
    if (existing) {
      await base44.entities.TypeBackground.update(existing.id, { imageUrl: file_url });
    } else {
      await base44.entities.TypeBackground.create({ type, imageUrl: file_url });
    }
    await load();
    setUploadingType(null);
  };

  const handleDelete = async (type) => {
    const existing = getBg(type);
    if (!existing) return;
    await base44.entities.TypeBackground.delete(existing.id);
    setBackgrounds((prev) => prev.filter((b) => b.id !== existing.id));
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ALL_TYPES.map((type) => {
        const bg = getBg(type);
        return (
          <div key={type} className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs font-bold mb-2">{type}</p>
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/10 mb-2 flex items-center justify-center">
              {bg ? (
                <>
                  <img src={bg.imageUrl} alt={type} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDelete(type)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <span className="text-[10px] text-white/40 px-2">No image (AI creates its own)</span>
              )}
            </div>
            <label className="flex items-center justify-center gap-1 bg-white/10 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] font-semibold">
              {uploadingType === type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(type, e)}
                disabled={uploadingType === type}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}