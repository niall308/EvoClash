import React, { useState } from "react";
import { X, Loader2, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

export default function EditProfileModal({ user, onClose, onSaved }) {
  const [username, setUsername] = useState(user.username || "");
  const [imageUrl, setImageUrl] = useState(user.profilePictureUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await base44.functions.invoke("updateProfile", {
        username,
        profilePictureUrl: imageUrl,
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
      <div className="bg-[#12233A] rounded-2xl p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg">Edit Profile</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        <div className="flex justify-center mb-5">
          <label className="relative cursor-pointer">
            <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <Image src={imageUrl} className="w-full h-full" />
              ) : (
                <Camera className="w-6 h-6 text-white/40" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1.5">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin text-black" /> : <Camera className="w-3 h-3 text-black" />}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>

        <label className="text-white/50 text-xs font-semibold">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none mt-1 mb-1"
          placeholder="Choose a unique username"
          maxLength={30}
        />
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || uploading || !username.trim()}
          className="w-full bg-amber-500 text-black font-bold py-2.5 rounded-full mt-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}