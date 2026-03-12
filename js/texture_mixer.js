(function () {
    const form = document.getElementById("imageMixerForm");
    const originalInput = document.getElementById("originalImage");
    const textureInput  = document.getElementById("textureImage");

    const resultArea   = document.getElementById("resultArea");
    const mixedImgEl   = document.getElementById("mixedImage");
    const placeholder  = document.getElementById("resultPlaceholder");

    const spinner    = document.getElementById("loadingSpinner");
    const buttonText = document.getElementById("buttonText");
    const statusMsg  = document.getElementById("statusMessage");
    const mixButton  = document.getElementById("mixButton");

    const submitSection = form.querySelector(".submit-section");


    const dlBtn = document.createElement("a");
    dlBtn.textContent = "Download result";
    dlBtn.className = "mix-button";
    dlBtn.style.textDecoration = "none";
    dlBtn.style.display = "none";
    submitSection.appendChild(dlBtn);

    async function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        });
    }


    async function safeJson(resp) {
        const ct = resp.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {

            const _t = await resp.text().catch(() => "");
            throw new Error("Temporary non-JSON response");
        }
        return resp.json();
    }


    async function withRetry(fn, { retries = 3, initialDelay = 600 } = {}) {
        let err;
        let delay = initialDelay;
        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            } catch (e) {
                err = e;
                if (i < retries) {

                    await new Promise(r => setTimeout(r, delay));
                    delay *= 1.7;
                }
            }
        }
        throw err;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        statusMsg.innerHTML = "";
        if (!originalInput.files[0] || !textureInput.files[0]) {
            statusMsg.textContent = "Please select both images.";
            return;
        }


        mixButton.disabled = true;
        spinner.classList.remove("hidden");
        buttonText.textContent = "Combining…";
        statusMsg.innerHTML = '<span class="status-typing"><span></span><span></span><span></span></span>';

        try {
            const [structureDataUrl, textureDataUrl] = await Promise.all([
                fileToDataURL(originalInput.files[0]),
                fileToDataURL(textureInput.files[0]),
            ]);


            const data = await withRetry(async () => {
                const resp = await fetch("/mix-texture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        structureBase64: structureDataUrl,
                        textureBase64: textureDataUrl,
                        prompt:
                            "Apply the material naturally on surfaces. Respect lighting and shading of the structure.",
                    }),
                });

                if (!resp.ok) {

                    let errMsg = "Request failed";
                    try {
                        const j = await safeJson(resp);
                        errMsg = j?.error || errMsg;
                    } catch {

                        errMsg = "Server is busy. Please try again.";
                    }
                    throw new Error(errMsg);
                }


                return safeJson(resp);
            }, { retries: 3, initialDelay: 700 });


            placeholder.style.display = "none";
            mixedImgEl.style.display = "block";
            mixedImgEl.src = data.imageDataUrl;
            mixedImgEl.classList.add("zoomable");
            resultArea.classList.remove("hidden");


            dlBtn.href = data.imageDataUrl;
            dlBtn.download = "texture-fusion.png";
            dlBtn.style.display = "inline-flex";

            statusMsg.innerHTML = "✅ Done!";
        } catch (err) {
            statusMsg.textContent = "Something went wrong. Please try again.";
        } finally {
            mixButton.disabled = false;
            spinner.classList.add("hidden");
            buttonText.textContent = "Combine with AI";
        }
    });
})();
