import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Trash2, Loader2 } from "lucide-react";

export default function CardBackManager() {
  const [backs, setBacks] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => setBacks(await base44.entities.CardBack.list("-created_date"));
  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.CardBack.create({ name: file.name, imageUrl: file_url });
    await load();
    setUploading(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.CardBack.delete(id);
    setBacks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Card Back Designs</h2>
      <label className="flex items-center gap-2 bg-white/10 px-4 py-3 rounded-xl w-fit cursor-pointer text-sm font-semibold">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload Image
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
      <div className="grid grid-cols-4 gap-3 mt-4">
        {backs.map((b) => (
          <div key={b.id} className="relative">
            <img src={b.imageUrl} alt={b.name} className="w-full aspect-[3/4] object-cover rounded-lg border border-white/20" />
            <button onClick={() => handleDelete(b.id)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}