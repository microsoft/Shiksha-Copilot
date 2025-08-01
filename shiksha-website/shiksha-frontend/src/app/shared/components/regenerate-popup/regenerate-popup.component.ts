import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalService } from '../modal/modal.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InstructionsPopupComponent } from '../instructions-popup/instructions-popup.component';

@Component({
  selector: 'app-regenerate-popup',
  templateUrl: './regenerate-popup.component.html',
  styleUrls: ['./regenerate-popup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule,InstructionsPopupComponent],
})
export class RegeneratePopupComponent {
  @Output() regenerate = new EventEmitter<any>();
  @Input() regenerateReason: any;

  instructions = [
    {
      type: 'engage',
      description:
        '1. Incorporate a real-world scenario involving the use of reflective surfaces in everyday life, such as car mirrors or solar panels.<br><br>2. Incorporate a hands-on activity where students use geometric tools to explore the properties and congruence criteria of triangles.<br><br>3. Introduce a real-world example of a recent election to illustrate the importance of voting.',
    },
    {
      type: 'explore',
      description:
        '1. Include experiments that explore how different materials affect the transmission of light, such as transparent, translucent, and opaque objects.<br><br>2. Incorporate real-life examples of congruent triangles in architecture and nature, emphasizing the use of SSS, SAS, ASA, AAS, and RHS criteria.<br><br>3. Discuss the historical transition from monarchies to democracies and its impact on decision-making in societies, using examples from the chapter.',
    },
    {
      type: 'explain',
      description:
        '1. Include an experiment where students use different colored cellophane to explore how light passes through and affects the color of shadows.<br><br>2. Include an explanation of the Pythagorean Theorem and its application in right triangles.<br><br>3. Discuss the historical transition from monarchies to democracies and its impact on decision-making in societies, using examples from the chapter.',
    },
    {
      type: 'elaborate',
      description:
        '1. Add a scenario where students observe reflections using different types of mirrors, such as concave and convex mirrors.<br><br>2. Add an experiment where students create and test the stability of different triangular structures using materials like straws or sticks.<br><br>3. Include an activity that explores the administrative strategies of the Mauryan Empire, focusing on the role of the Arthashastra in governance.',
    },
    {
      type: 'evaluate',
      description:
        "1. Incorporate an experiment-based question where students design a simple experiment to observe the process of germination in seeds.<br><br>2. Incorporate a problem that requires proving the congruence of triangles using the ASA (Angle-Side-Angle) criterion.<br><br>3. Incorporate questions that explore the impact of significant battles and the spread of Buddhism during Ashoka's reign.",
    },
  ];

  disabled = true;

  showInstructions=false

  regenFeedback = [
    {
      type: 'engage',
      feedback: '',
    },
    {
      type: 'explore',
      feedback: '',
    },
    {
      type: 'explain',
      feedback: '',
    },
    {
      type: 'elaborate',
      feedback: '',
    },
    {
      type: 'evaluate',
      feedback: '',
    },
  ];

  constructor(private modalService: ModalService) {}

  feedbackUpdated() {
    this.disabled = !this.regenFeedback.some(
      (ele: any) => ele.feedback && ele.feedback.trim() !== ''
    );
  }

  closeModal() {
    this.regenerate.emit(false);
    this.modalService.showRenegenerateDialog = false;
  }

  regeneratePlan() {
    if (!this.disabled) {
      this.regenerate.emit(this.regenFeedback);
    }
  }
}
