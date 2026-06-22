/* Utilitario de overlay/modal com scroll-lock no <html>.
   Resolve o bug do bottom nav se mover no iOS PWA quando
   um overlay abre/fecha e o viewport muda. */

const Modal = {
  _touchBlock: null,
  _scrollY: 0,

  /* Abre um overlay full-screen com fundo escuro.
     Retorna o elemento overlay para o chamador posicionar conteudo dentro. */
  open() {
    this._scrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";

    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;" +
      "display:flex;align-items:flex-end;justify-content:center";
    document.body.appendChild(overlay);

    this._touchBlock = e => e.preventDefault();
    overlay.addEventListener("touchmove", this._touchBlock, { passive: false });

    return overlay;
  },

  /* Fecha e remove o overlay, restaura scroll. */
  close() {
    const overlay = document.getElementById("modal-overlay");
    if (overlay) {
      if (this._touchBlock) {
        overlay.removeEventListener("touchmove", this._touchBlock);
        this._touchBlock = null;
      }
      document.body.removeChild(overlay);
    }
    document.documentElement.style.overflow = "";
    window.scrollTo(0, this._scrollY);
  },
};
