import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from 'src/environments/environment';

export interface Teacher {
  _id: string;
  name: string;
  phone: string;
  zone: string;
  district: string;
  state: string;
  taluk: string;
  schoolId: string;
  block: string;
  schoolName: string;
  role: string;
  // Add any other relevant teacher properties
  attendance: string[];
}

export interface Batch {
  _id?: string; // Add _id as it comes from MongoDB
  batchName: string;
  description: string;
  scheduleDate: string;
  trainingType: string;
  assignedTeachers?: Teacher[]; // Array to store assigned teachers
  attendance?: string[]; // Array to store IDs of teachers marked as present
  isSubmitted?: boolean; // New field to indicate if the batch has been submitted
  pdfPath?: string;
  photoPaths?: { path: string; mimetype: string }[];
  attendancePdfPath?: string;
  createdBy?: { name: string }; // <-- Add this for manager/admin name
}

export interface TeacherStats {
  totalTeachers: number;
  trainedTeachers: number;
  untrainedTeachers: number;
}

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  baseUrl:any;
  private batchesSubject = new BehaviorSubject<Batch[]>([]);
  batches$ = this.batchesSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    this.baseUrl = environment.apiUrl;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token || '',
      'Content-Type': 'application/json'
    });
  }

  addBatch(batchData: FormData | Batch): Observable<any> {
    const headers = this.getAuthHeaders();
    if (batchData instanceof FormData) {
      // For FormData, don't set Content-Type header as it will be set automatically
      const token = localStorage.getItem('token');
      const formDataHeaders = new HttpHeaders({
        'Authorization': token || ''
      });
      return this.http.post<any>(`${this.baseUrl}/teacher-training-batches`, batchData, { headers: formDataHeaders });
    }
    return this.http.post<any>(`${this.baseUrl}/teacher-training-batches`, batchData, { headers });
  }

  fetchBatches(): Observable<Batch[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Batch[]>(`${this.baseUrl}/teacher-training-batches`, { headers });
  }

  assignTeacherToBatch(batchId: string, teacherId: string): Observable<Batch> {
    const headers = this.getAuthHeaders();
    return this.http.post<Batch>(`${`${this.baseUrl}/teacher-training-batches`}/${batchId}/assign-teacher`, { teacherId }, { headers });
  }

  removeTeacherFromBatch(batchId: string, teacherId: string): Observable<Batch> {
    const headers = this.getAuthHeaders();
    return this.http.post<Batch>(`${`${this.baseUrl}/teacher-training-batches`}/${batchId}/remove-teacher`, { teacherId }, { headers });
  }

  setBatches(batches: Batch[]): void {
    this.batchesSubject.next(batches);
  }

  deleteBatch(batchId: string): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${`${this.baseUrl}/teacher-training-batches`}/${batchId}`, { headers });
  }

  updateAttendance(batchId: string, attendance: string[]): Observable<Batch> {
    const headers = this.getAuthHeaders();
    return this.http.put<Batch>(`${`${this.baseUrl}/teacher-training-batches`}/${batchId}/attendance`, { attendance }, { headers });
  }

  submitBatch(batchId: string): Observable<Batch> {
    const headers = this.getAuthHeaders();
    return this.http.put<Batch>(`${`${this.baseUrl}/teacher-training-batches`}/${batchId}/submit`, {}, { headers });
  }

  getBatchById(batchId: string): Observable<Batch> {
    const headers = this.getAuthHeaders();
    return this.http.get<Batch>(`${this.baseUrl}/teacher-training-batches/${batchId}`, { headers });
  }

  // New method to fetch a file as a Blob
  getFile(path: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    // Assuming the path starts with 'uploads/' and needs to be relative to the base URL
    const fullUrl = `/${path}`;
    return this.http.get(fullUrl, { headers, responseType: 'blob' });
  }

extractActualFilename(url:any) {
  try {
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split("/");
    const fullFilename = segments[segments.length - 1];

    if (!fullFilename) return null; // No filename found

    if (!fullFilename.includes("_")) return fullFilename;

    return fullFilename.split("_").slice(1).join("_");
  } catch (err) {
    console.error("Invalid URL:", err);
    return null;
  }
}



  updateBatchInList(updatedBatch: Batch): void {
    const currentBatches = this.batchesSubject.getValue();
    const index = currentBatches.findIndex(batch => batch._id === updatedBatch._id);
    if (index !== -1) {
      currentBatches[index] = updatedBatch;
      this.batchesSubject.next([...currentBatches]);
    }
  }

  uploadBatchFiles(batchId: string, formData: FormData): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': token || ''
    });
    return this.http.post(`${this.baseUrl}/teacher-training-batches/${batchId}/upload-pdf`, formData, { headers });
  }

  getTeacherTrainingStats(): Observable<TeacherStats> {
    const headers = this.getAuthHeaders();
    return this.http.get<TeacherStats>(`${this.baseUrl}/teacher-training-batches/stats`, { headers });
  }

  // Download the batch Excel report from the backend
  downloadBatchExcelReport(batchId: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/teacher-training-batches/${batchId}/export-report`, {
      headers,
      responseType: 'blob'
    });
  }
} 