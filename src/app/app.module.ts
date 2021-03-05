import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { ImageCropperModule } from "ngx-image-cropper";
import { NgxImageCompressService } from "ngx-image-compress";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MatProgressBarModule } from "@angular/material/progress-bar";

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        ImageCropperModule,
        BrowserAnimationsModule,
        MatProgressBarModule
    ],
    providers: [NgxImageCompressService],
    bootstrap: [AppComponent]
})
export class AppModule { }
