import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChatbotService } from './chatbot.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UtilityService } from 'src/app/core/services/utility.service';
import { SidebarService } from 'src/app/layout/sidebar/sidebar.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileImageComponent } from 'src/app/shared/components/profile-image/profile-image.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InstructionsPopupComponent } from 'src/app/shared/components/instructions-popup/instructions-popup.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/modal.service';

interface ChatMessages {
  answer?: string;
  question?: string;
  createdAt?: string;
  _id?: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss'],
  standalone:true,
  imports:[CommonModule, FormsModule, TranslateModule, ProfileImageComponent,InstructionsPopupComponent, ModalComponent]
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('textArea') textArea!: ElementRef<any>;
  @ViewChild('header') header!: ElementRef<any>;

  messages: ChatMessages[] = [];

  chatValue: any;

  isLoading = false;

  typeSubscription:Subscription;

  paramSubscription!:Subscription;

  type:any;

  recordId:any;

  chapterId:any;

  chapterDetails:any;

  showInstructions=false

  instructions = [
    {
      type: 'Science',
      description:
        '1. Incorporate a real-world scenario involving the use of reflective surfaces in everyday life, such as car mirrors or solar panels.<br><br>2. Add an experiment involving the use of mirrors to study the reflection of light, including practical applications of redirecting light using mirrors.<br><br>3. Include questions about the different types of asexual reproduction in plants, such as budding and fragmentation.<br><br>4. Suggest an activity where students compare the motion of different objects, such as a rolling ball and a sliding book, and analyze the factors affecting their speeds.<br><br>5. Introduce an experiment demonstrating the reaction of metals with acids, highlighting the production of hydrogen gas.',
    },
    {
      type: 'Social Science',
      description:
        '1. Add a discussion on the role of media in elections and how it influences public opinion.<br><br>Examine the principles of administration, foreign policy, and financial management in the Arthashastra and their application in the Mauryan and Kushan empires, including the roles of spies, the military system, and tax collection.<br><br>2. Discuss the historical transition from monarchies to democracies and its impact on decision-making in societies, using examples from the chapter.<br><br>3. Suggest students create a project on the role of government policies in shaping land use and agricultural development in India.<br><br>4. Compare the social structures and economic activities of urban, rural, and tribal communities, highlighting the impact of industrialization and urbanization.',
    },
    {
      type: 'Mathematics',
      description:
        "1. Suggest hands-on activities using materials like cardboard, string, or sticks to explore the properties of isosceles and equilateral triangles.<br><br>2. Add an experiment where students create and test the stability of different triangular structures using materials like straws or sticks.<br><br>Design interactive activities for both small and large groups that involve solving percentage problems through collaborative and competitive tasks.<br><br>3. Propose a real-world application where students calculate the area of an irregularly shaped plot of land using Heron's Formula, emphasizing the importance of accurate measurements.<br><br>4. Include MCQs that test understanding of the derivation of Heron's formula.<br><br>5. Include an explanation of the Pythagorean Theorem and its application in right triangles.",
    },
    {
      type: 'English',
      description:
        '1. Analyze the character traits of a merciful person based on the poem. How do these traits compare to those of a just person?<br><br>2. Write a paragraph about your favorite hobby using at least five adjectives. Highlight the adjectives.<br><br>3. Create ten sentences using different tenses (past, present, and future).<br><br>4. Write a four-line poem about your best friend.<br><br>5. Write a poem about your favorite season. Use vivid imagery to describe the sights, sounds, and feelings it evokes.<br><br>6. Suggest an activity to discuss personal experiences with insects that connect with the poem "The Fly."',
    }
  ];

  /**
   * Class constructor
   * @param chatbotService
   * @param sanitizer
   * @param utilityService
   */
  constructor(
    private chatbotService: ChatbotService,
    private sanitizer: DomSanitizer,
    public utilityService: UtilityService,
    public sidebarService:SidebarService,
    private activatedRoute: ActivatedRoute,
    private router:Router,
    public modalService:ModalService
  ) {
    this.typeSubscription = this.activatedRoute.data.subscribe((data:any)=>{
      this.type = data.type;
    })
    
    if(this.type === 'index'){
      this.paramSubscription = this.activatedRoute.queryParams.subscribe(params => {
        this.recordId = params['recordId']
        this.chapterId = params['chapterId']
      });
    }
  }

  /**
   * ngOnInit lifecycle hook of angular used here to initialize chat messages
   */
  ngOnInit(): void {
    if(this.type === 'general'){
      this.getGeneralMessages();
    } else if(this.type === 'index'){
      this.getIndexMessages();
    }else{
      return
    }
  }

  /**
   * Function to have dynamic textarea height
   * @param textArea 
   */
  adjustHeight(textArea: HTMLTextAreaElement) {
    textArea.style.height = 'auto';
    textArea.style.height = `${textArea.scrollHeight}px`;
  }

  scrollToTextarea() {
    this.textArea.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  scrollToTop() {
    this.header.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Function to format chat response
   * @param text 
   * @returns 
   */
  transformText(text: string): SafeHtml {
    let transformedText = text
      .replace(/\\n/g, '<br>')
      .replace(/\\"/g, '"')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/###/g, '');
    return this.sanitizer.bypassSecurityTrustHtml(transformedText);
  }

  /**
   * Function to get messages
   */
  getGeneralMessages() {
    this.chatbotService.getGeneralMessages().subscribe({
      next: (res) => {
        this.messages = res.data.messages;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.utilityService.handleError(err);
      },
    });
  }

    /**
   * Function to get messages
   */
    getIndexMessages() {
      this.chatbotService.getIndexMessages(this.recordId,this.chapterId).subscribe({
        next: (res) => {
          this.messages = res.data.messages;
          this.chapterDetails = res?.data?.chapterDetails;
          this.chapterDetails.subject = this.utilityService.getSubjectDisplayName(res?.data?.subject);
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.utilityService.handleError(err);
        },
      });
    }

  /**
   * Function to send message
   * @returns 
   */
  sendMessage() {
    if (this.isLoading) {
      return;
    }
    if (this.chatValue.trim()) {
      const messageObj = {
        message: this.chatValue,
      };

      const questionObj: ChatMessages = {
        question: this.chatValue,
        answer: '',
        createdAt: '',
        _id: '',
      };

      this.messages.unshift(questionObj);

      this.chatValue = null;
      this.textArea.nativeElement.style.height = '36px';
      this.isLoading = true;

      if(this.type === 'general'){
        this.sendGeneralMessage(messageObj)
      }else{
        this.sendIndexMessage(messageObj)
      }
    
    }
  }

  sendGeneralMessage(messageObj:any){
    this.chatbotService.sendGeneralMessage(messageObj).subscribe({
      next: (res) => {
        if (res.data) {
          this.getGeneralMessages();
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.messages.shift();
          this.utilityService.showError(err?.error?.message);
        } else {
          this.utilityService.handleError(err);
        }
        this.isLoading = false;
      },
    });
  }

  sendIndexMessage(messageObj:any){
    this.chatbotService.sendIndexMessage(messageObj,this.recordId,this.chapterId).subscribe({
      next: (res) => {
        if (res.data) {
          this.getIndexMessages();
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.messages.shift();
          this.utilityService.showError(err?.error?.message);
        } else {
          this.utilityService.handleError(err);
        }
        this.isLoading = false;
      },
    });
  }

  backNavigation(){
    this.router.navigate(['/user/content-generation'])
  }

  ngOnDestroy(): void {
    this.typeSubscription.unsubscribe();
    if(this.paramSubscription){
      this.paramSubscription.unsubscribe();
    }
  }
}
