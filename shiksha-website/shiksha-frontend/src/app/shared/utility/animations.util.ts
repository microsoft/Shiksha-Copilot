import { trigger, transition, style, animate, query, stagger, keyframes } from '@angular/animations';

export const fadeInOutAnimation = trigger('fadeInOut', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('300ms', style({ opacity: 0 })),
  ]),
]);

export const slideInOutAnimation = trigger('slideInOut', [
    transition(':enter', [
      style({ transform: 'translateY(-100%)', opacity: 0 }),
      animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
    ]),
    transition(':leave', [
      animate('300ms ease-in', style({ transform: 'translateY(-100%)', opacity: 0 })),
    ]),
  ]);
  
  export const listAnimation = trigger('listAnimation', [
    transition('* => *', [
      query(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        stagger('100ms', animate('300ms ease-out', style({ opacity: 1, transform: 'none' }))),
      ], { optional: true }),
      query(':leave', [
        stagger('50ms', animate('200ms ease-in', keyframes([
          style({ opacity: 1, transform: 'none', offset: 0 }),
          style({ opacity: 0, transform: 'translateY(-10px)', offset: 1 }),
        ]))),
      ], { optional: true }),
    ]),
  ]);
  
  export const scaleAnimation = trigger('scale', [
    transition(':enter', [
      style({ transform: 'scale(0.5)', opacity: 0 }),
      animate('300ms cubic-bezier(.8, -0.6, 0.2, 1.5)', style({ transform: 'scale(1)', opacity: 1 })),
    ]),
    transition(':leave', [
      animate('300ms cubic-bezier(.8, -0.6, 0.2, 1.5)', style({ transform: 'scale(0.5)', opacity: 0 })),
    ]),
  ]);


  export const stepperAnimations = [
    trigger('stepperAnimation', [
      transition('forward => *', [
        style({ transform: 'translateX(0)' }), 
        animate('300ms ease-out', style({ transform: 'translateX(-100%)' }))  
      ]),
  
      transition('backward => *', [
        style({ transform: 'translateX(0)' }), 
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))  
      ])
    ])
  ];