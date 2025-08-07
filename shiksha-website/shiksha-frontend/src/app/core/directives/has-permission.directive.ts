import { Directive, ElementRef, OnInit, Input } from '@angular/core';
import { UtilityService } from '../services/utility.service';

@Directive({
  standalone:true,
  selector: '[hasPermission]',
})
export class HasPermissionDirective implements OnInit {
  @Input('hasPermission') permission!: string[];

  constructor(private el: ElementRef, private utilityService: UtilityService) {}

  ngOnInit() {
    const result = this.utilityService.hasPermission(this.permission);
    if(!result){
      this.hideElement();
    }
  }

  hideElement() {
      this.el.nativeElement.style.setProperty('display', 'none', 'important');
    }
}
