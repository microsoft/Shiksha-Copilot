import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UtilityService } from 'src/app/core/services/utility.service';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  standalone: true,
  imports:[CommonModule]
})
export class PaginationComponent {

  @Input() totalItems: number = 0;
  @Input() pageSize: number = 10;
  @Input() currentPage: number = 1;
  @Output() pageChange = new EventEmitter<number>();

  constructor(private utilityService: UtilityService) { }
  
  getPageNumbers():number[] {
    return this.utilityService.getPageNumbers(this.totalItems, this.pageSize);
  }

  onPageChange(page: number): void {
    // Emit  the page is changed when there is no single page or no last page or no same page
    if (page < 1 || page > this.totalItems || page === this.currentPage) {
      return;
    }
    this.pageChange.emit(page);
  }

  getDisplayRange(): string {
    const startRecord = (this.currentPage - 1) * this.pageSize + 1;
    const endRecord = this.currentPage * this.pageSize;
    const adjustedEndRecord = endRecord > this.totalItems ? this.totalItems : endRecord;
    return `${startRecord} - ${adjustedEndRecord}`;
  }

}
