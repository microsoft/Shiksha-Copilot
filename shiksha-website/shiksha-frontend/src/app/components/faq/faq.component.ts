import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent {

  /**
   * Class constructor
   * @param location Location
   */
  constructor(private location:Location){}

  /**
   * method to navigate back
   */
  goBack() {
    this.location.back();
  }
}
