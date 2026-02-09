document.addEventListener("click", function (e) {
    const zoomable = e.target.closest(".zoomable");
    if (!zoomable) return;

    const overlay = document.createElement("div");
    overlay.className = "zoom-overlay";

    const img = document.createElement("img");
    img.src = zoomable.src;
    img.alt = zoomable.alt || "Zoomed image";
    overlay.appendChild(img);

    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
});
