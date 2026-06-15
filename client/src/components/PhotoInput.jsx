import { useRef } from 'react';

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Invalid image')); };
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      let result = canvas.toDataURL('image/jpeg', quality);
      while (result.length > 600 * 1024 && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    img.src = objectUrl;
  });
}

export default function PhotoInput({ value, onChange, round = false }) {
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch {
      alert('Could not process image. Try a different file.');
    }
  }

  return (
    <div className="photo-input-wrap">
      {value ? (
        <img
          src={value} alt="Preview"
          className={round ? 'photo-input-preview photo-input-preview-round' : 'photo-input-preview'}
        />
      ) : (
        <div className={round ? 'photo-input-placeholder photo-input-placeholder-round' : 'photo-input-placeholder'}>
          {round ? '?' : 'No photo yet'}
        </div>
      )}
      <div className="photo-input-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>
          Upload photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <input
          type="url" className="form-input" placeholder="…or paste image URL"
          value={value?.startsWith('data:') ? '' : (value || '')}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>
      <p className="form-hint">Upload any photo or paste an image URL.</p>
    </div>
  );
}
