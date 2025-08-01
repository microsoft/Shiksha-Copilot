import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuditLogService } from './audit-log.service';
import { TranslateModule } from '@ngx-translate/core';
import { HasPermissionDirective } from 'src/app/core/directives/has-permission.directive';
import { PaginationComponent } from 'src/app/shared/components/pagination/pagination.component';
import { AuditLogList } from 'src/app/shared/interfaces/auditlog.interface';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    HasPermissionDirective,
    PaginationComponent,
  ],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss'],
})
export class AuditLogComponent implements OnInit {
  auditLogListData!: [AuditLogList];

  auditLogHeaders = [
    'Event Type',
    'Created By',
    'Created At',
    'Log URL',
    'Status',
  ];

  currentPage = 1;

  pageSize = 10;

  totalItems = 0;

  /**
   * Class constructor
   * @param auditLogService AuditLogService
   */
  constructor(private auditLogService: AuditLogService) {}

  /**
   * OnInit lifecycle hook for initialization
   */
  ngOnInit(): void {
    this.getAuditLogs();
  }

  /**
   * Function to get auditlog list data
   */
  getAuditLogs(): void {
    this.auditLogService
      .getAuditLogs(this.currentPage, this.pageSize)
      .subscribe({
        next: (res: any) => {
          this.auditLogListData = res.data['results'];
          this.totalItems = res.data.totalItems;
          if (this.totalItems <= 10) {
            this.currentPage = 1;
          }
        },
        error: (err) => {
          console.error('Error while fetching list', err);
        },
      });
  }

  /**
   * Function to refresh the audit log list
   */
  refresh() {
    this.currentPage = 1;
    this.getAuditLogs();
  }

  /**
   * pagination
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.getAuditLogs();
  }
}
