import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  standalone:true,
  imports:[CommonModule, TranslateModule]
})
export class AccordionComponent {
  @Input() title!: string;
  @Input() subtitle!: string;
  @Input() imgSrc!: string;
  isOpen = false;

  toggle() {
    this.isOpen = !this.isOpen;
  }
}
