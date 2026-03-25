/**
 * PhotoViewer — HTML overlay that displays an artwork when the player interacts
 * with a painting. Uses DOM elements defined in index.html for full image quality.
 *
 * artwork shape: { title, description, image, author?, year? }
 */
export class PhotoViewer {
  constructor() {
    this._overlay = document.getElementById('photo-overlay');
    this._img     = document.getElementById('photo-img');
    this._title   = document.getElementById('photo-title');
    this._author  = document.getElementById('photo-author');
    this._desc    = document.getElementById('photo-description');
    this._close   = document.getElementById('photo-close');
    this.isOpen   = false;

    this._close.addEventListener('click', () => this.hide());

    // Click outside the card to close
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.hide();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.hide();
    });
  }

  show(artwork) {
    this._title.textContent  = artwork.title       ?? 'Sin título';
    this._author.textContent = artwork.author
      ? `${artwork.author}${artwork.year ? ` · ${artwork.year}` : ''}`
      : '';
    this._desc.textContent   = artwork.description ?? '';

    // Set image; use placeholder text if no image yet
    if (artwork.image) {
      this._img.src        = artwork.image;
      this._img.alt        = artwork.title ?? '';
      this._img.style.display = 'block';
    } else {
      this._img.style.display = 'none';
    }

    this._overlay.classList.add('visible');
    this.isOpen = true;
  }

  hide() {
    this._overlay.classList.remove('visible');
    this.isOpen = false;
  }
}
