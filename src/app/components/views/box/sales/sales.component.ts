import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.css'
})
export class BoxSalesComponent {

  sales: any[] = [];

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.send('get-sales');

      window.electron.receive('get-sales-response', (response: any) => {
        if (response.success) {
            this.sales = response.data
            for (let sale of this.sales) {
              const { formattedDate, formattedTime } = this.parseDateAndTime(sale.date);
              sale.formattedDate = formattedDate;
              sale.formattedTime = formattedTime;
            }
            this.cdr.detectChanges();
        } else {
            console.error('Error al obtener productos:', response.error);
        }
      });
    }
  }

  parseDateAndTime(dateString: string) {
    const date = new Date(dateString);
  
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
  
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;
  
    return { formattedDate, formattedTime };
  }  
}
