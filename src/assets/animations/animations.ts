import { animate, state, style, trigger, transition } from '@angular/animations';

export const hamburgerAnimation = trigger('hamburger', [
  state('hamburger', style({ margin: '.4rem' })),
  state(
    'topX',
    style({
      transform: 'rotate(45deg) translate(4px, 9px)',
      transformOrigin: 'left',
      margin: '1.05rem'
    })
  ),
  state(
    'hide',
    style({
      opacity: 0,
      transform: 'translateX(40%)'
    })
  ),
  state(
    'bottomX',
    style({
      transform: 'rotate(-45deg) translate(4px, -9px)',
      transformOrigin: 'left',
      margin: '1.05rem'
    })
  ),
  transition('* => *', [
    animate('200ms 50ms'),
  ]),
])
