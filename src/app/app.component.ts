import { Component, HostListener, NgZone } from "@angular/core";
import { ProgressBarMode } from "@angular/material/progress-bar";
import { DOC_ORIENTATION, NgxImageCompressService } from "ngx-image-compress";
import { CropperPosition, Dimensions, ImageCroppedEvent, ImageTransform } from "ngx-image-cropper";
import { of } from "rxjs";
import { createWorker, OEM } from "tesseract.js";
import { runInThisContext } from "vm";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"]
})
export class AppComponent {

    public title = "PoE-HarvestScanner";

    public croppedImage?: File;

    public sourceImage?: File;

    public cropper: CropperPosition = {} as CropperPosition;

    public ocrWorker?: Tesseract.Worker;

    public ocrResult = "";

    public imageUrl = "";

    public crafts: string[];

    public progressMode?: ProgressBarMode;

    public progressValue = 0;

    public constructor(private compressService: NgxImageCompressService, private zone: NgZone) {
        this.initOCR();
    }

    @HostListener("document:paste", ["$event"])
    public onPaste(e: ClipboardEvent): void {
        const items = ((e.clipboardData || (e as any).originalEvent.clipboardData) as DataTransfer).items;
        for (const item of items) {
            if (item.type.indexOf("image") === 0) {
                this.progressMode = "indeterminate";

                const file = item.getAsFile();
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);

                img.onload = () => {
                    this.sourceImage = file;
                };

                img.src = objectUrl;

                return;
            }
        }
    }

    public imageCropped(event: ImageCroppedEvent) {
        if (event.cropperPosition.x1 === 0) {
            return;
        }

        this.progressMode = "indeterminate";

        let image = new Image();
        image.onload = () => {

            let canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            let ctx = canvas.getContext("2d");

            ctx.fillStyle = "#FFF";
            ctx.fillRect(0, 0, image.width, image.height);
            ctx.globalCompositeOperation = "luminosity";
            ctx.drawImage(image, 0, 0);

            ctx.globalCompositeOperation = "difference";
            ctx.fillStyle = "#FFF";
            ctx.fillRect(0, 0, image.width, image.height);

            const iconWidth = 0.16;
            const craftWidth = 0.7;
            const levelWidth = 1 - craftWidth - iconWidth;

            const craftCanvas = document.createElement("canvas");
            const craftContext = craftCanvas.getContext("2d");

            craftCanvas.width = image.width * craftWidth;
            craftCanvas.height = image.height;

            const sourceX = image.width * iconWidth;
            const sourceWidth = image.width * craftWidth;

            craftContext.drawImage(canvas, sourceX, 0, sourceWidth, image.height, 0, 0, craftCanvas.width, craftCanvas.height);

            this.imageUrl = craftCanvas.toDataURL();

            this.doOCR();
        };
        image.src = event.base64;
    }
    public imageLoaded(image: HTMLImageElement) {
    }
    public cropperReady(imageSize: Dimensions) {

        let x1 = imageSize.width * 0.155;
        let x2 = imageSize.width * 0.43;
        if (imageSize.width / imageSize.height > 3) {
            x1 = imageSize.width / 2 * 0.155;
            x2 = imageSize.width / 2 * 0.43;
        }

        this.cropper = {
            x1,
            y1: imageSize.height * 0.25,
            x2,
            y2: imageSize.height * 0.70
        };
    }
    public loadImageFailed() {
        // show message
    }


    public async initOCR() {
        this.ocrWorker = createWorker({
            logger: m => {
                if (m.status === "recognizing text") {
                    this.zone.run(() => {
                        this.progressValue = m.progress * 100;
                    });
                }
            },
            workerPath: "/assets/tesseract/worker.min.js",
            langPath: "/assets/tesseract",
            corePath: "/assets/tesseract/tesseract-core.wasm.js"
        });

        await this.ocrWorker.load();
        await this.ocrWorker.loadLanguage("eng");
        await this.ocrWorker.initialize("eng");
        await this.ocrWorker.setParameters({
            tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+%,.-' ",

        });
    }

    public async doOCR() {
        this.ocrResult = "Analyzing";

        if (!this.imageUrl || !this.ocrWorker) {
            return;
        }

        this.progressMode = "determinate";
        this.progressValue = 0;

        const ocrWorker = this.ocrWorker;
        const croppedImage = this.imageUrl;

        const newLineTrigger = "Reforge|Randomise|Remove|Augment|Improves|Upgrades|Upgrade|Set|Change|Exchange|Sacrifice a|Sacrifice up|Attempt|Enchant|Reroll|Fracture|Add a random|Synthesise|Split|Corrupt".split("|");

        this.zone.runOutsideAngular(async () => {
            const result = await ocrWorker.recognize(croppedImage);

            const lines = result.data.lines;

            console.log(result);

            const crafts = [];
            for (const line of lines) {
                let lineText = "";
                for (const word of line.words) {
                    if (word.confidence < 60) {
                        continue;
                    }

                    lineText += " " + word.text;
                }

                lineText = lineText.trim();
                const isNewCraft = newLineTrigger.some(t => lineText.startsWith(t + " "));

                if (isNewCraft) {
                    crafts.push(lineText);
                } else {
                    crafts[crafts.length - 1] += "\n" + lineText;
                }
            }

            this.crafts = crafts.map(c => c.replace(/\r|\n/g, " ").replace(/\s+/g, " ").trim());

            console.log(this.crafts);

            this.progressMode = null;

            // await ocrWorker.terminate();
        });
    }


}
