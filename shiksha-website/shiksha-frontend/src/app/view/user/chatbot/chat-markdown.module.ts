import { NgModule } from "@angular/core";
import { MarkdownModule, MarkedOptions } from "ngx-markdown";

@NgModule({
    imports:[MarkdownModule.forRoot({
              markedOptions: {
                provide: MarkedOptions,
                useValue: {
                  breaks: true,
                },
              },
            })],
    exports:[MarkdownModule]

})

export class ChatMarkdownModule{}