import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class TeacherAbsentService {
    baseUrl:any;


  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  getAbsentTeachers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/teacher-absent`);
  }

  getAbsentTeachersByBatch(batchId: string): Observable<any[]> {
    return this.http.get<any[]>(`${`${this.baseUrl}/teacher-absent`}/batch/${batchId}`);
  }

  getPresentTeachersByBatch(batchId: string): Observable<any[]> {
    return this.http.get<any[]>(`${`${this.baseUrl}/teacher-absent`}/batch/${batchId}/present`);
  }

  downloadConsolidatedReport(batchId: string, batchName: string, totalTeachers: number, presentTeachers: number, absentTeachers: number) {
    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Summary worksheet
    const summarySheet = workbook.addWorksheet('Batch Report');
    const summaryData = [
      ['Batch Details'],
      ['Batch Name', batchName],
      ['Total Participants', totalTeachers],
      ['Present Teachers', presentTeachers],
      ['Absent Teachers', absentTeachers],
      [''],
      ['Detailed List']
    ];
    summaryData.forEach(row => summarySheet.addRow(row));

    // Add headers for absent teachers
    const headers = ['Name', 'Phone', 'Zone', 'District'];
    summarySheet.addRow(headers);

    // Get absent teachers data
    this.getAbsentTeachersByBatch(batchId).subscribe({
      next: (absentTeachersList) => {
        absentTeachersList.forEach(teacher => {
          summarySheet.addRow([
            teacher.teacherName,
            teacher.teacherPhone,
            teacher.teacherZone,
            teacher.teacherDistrict
          ]);
        });
        // Optionally also fetch present teachers and add as a separate sheet
        this.getPresentTeachersByBatch(batchId).subscribe({
          next: (presentTeachersList) => {
            const presentSheet = workbook.addWorksheet('Present Teachers');
            presentSheet.addRow(headers);
            presentTeachersList.forEach(t => {
              presentSheet.addRow([
                t.teacherName,
                t.teacherPhone,
                t.teacherZone,
                t.teacherDistrict
              ]);
            });
            // Download after both sheets are ready
            workbook.xlsx.writeBuffer().then((buffer) => {
              const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              saveAs(blob, `${batchName}_Report.xlsx`);
            });
          },
          error: (error) => {
            // Still download the summary sheet if present teachers fail
            workbook.xlsx.writeBuffer().then((buffer) => {
              const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              saveAs(blob, `${batchName}_Report.xlsx`);
            });
          }
        });
      },
      error: (error) => {
        console.error('Error generating report:', error);
      }
    });
  }
} 