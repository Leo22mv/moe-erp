import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-box',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink
  ],
  templateUrl: './box.component.html',
  styleUrls: ['./box.component.css']
})
export class BoxComponent {
  ngOnInit() {
    
  }
}
