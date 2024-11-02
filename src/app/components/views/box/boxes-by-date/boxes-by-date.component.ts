import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-boxes-by-date',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './boxes-by-date.component.html',
  styleUrl: './boxes-by-date.component.css'
})
export class BoxesByDateComponent {
  boxes: any[] = [];
  date: string = "";
  empty: boolean = false;
  loading: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    window.electron.receive('get-boxes-by-date-response', (response: any) => {
      if (response.success) {
        if (response.data.length > 0) {
          // console.log(response);
          this.boxes = response.data;
          this.boxes.forEach((box: any) => {
            window.electron.send('get-sales-by-box', box.box_id);
            
            window.electron.receive('get-sales-by-box-response', (salesResponse: any) => {
              // console.log(salesResponse);
              if (salesResponse.success) {
                if (salesResponse.data.length > 0) {
                  // console.log(salesResponse.data);
                  box.sales = salesResponse.data;
                }
              } else {
                console.error(salesResponse.error);
              }
            });
          });

          this.loading = false;

          console.log(this.boxes);
        } else {
          this.empty = true;
          this.loading = false;
        }
        this.cdr.detectChanges();
      } else {
        console.error(response.error);
      }
    });
  }

  getBoxesByDate() {
    this.clearBoxes();
    this.loading = true;
    const [year, month, day] = this.date.split("-");
    const formattedDate = `${day}/${month}/${year}`;
    // console.log(formattedDate)
    window.electron.send('get-boxes-by-date', formattedDate);
  }

  clearBoxes() {
    this.boxes = [];
    this.empty = false;
    this.cdr.detectChanges;
  }
}
