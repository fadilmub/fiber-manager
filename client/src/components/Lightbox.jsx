import React from 'react'

export default function Lightbox({ url, onClose }) {
  if (!url) return null
  return (
    <div id="lightbox" className={`lightbox show`} onClick={onClose}>
      <span className="close-lightbox" onClick={onClose}>&times;</span>
      <img src={url} alt="Foto" id="lightboxImg" />
    </div>
  )
}
