// excel-download.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';
import { UtilityService } from 'src/app/core/services/utility.service';

@Injectable({
    providedIn: 'root'
})
export class ExcelDownloadService {

    constructor(private http: HttpClient,private utilityService: UtilityService) { }

    downloadTemplate(templateType: string) {
        const filePath = `assets/excel_templates/${templateType}_template.xlsx`;

        this.http.get(filePath, { responseType: 'blob'}).subscribe({
            next: (blob)=>{
                saveAs(blob, `${templateType}_template.xlsx`);
            },
            error: (err)=>{
                this.utilityService.handleError(err);
            }
        });
    }


}
