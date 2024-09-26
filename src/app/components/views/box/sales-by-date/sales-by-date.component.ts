import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sales-by-date',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './sales-by-date.component.html',
  styleUrl: './sales-by-date.component.css'
})
export class SalesByDateComponent {
  sales: any[] = [];
  date: string = "";
  empty: boolean = false;
  total: number = 0;
  
  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() { }

  getSalesByDate() {
    this.clearSales();

    window.electron.send('get-sales-by-date', this.date);

    window.electron.receive('get-sales-by-date-response', (response: any) => {
      if (response.success) {
        this.total = 0;
        if (response.data.length < 1) {
          this.empty = true;
        } else {
          this.sales = response.data;
          for (let sale of this.sales) {
            const { formattedDate, formattedTime } = this.parseDateAndTime(sale.date);
            sale.formattedDate = formattedDate;
            sale.formattedTime = formattedTime;
            this.total += sale.total;
          }
        }
        console.log(JSON.stringify(response.data, null, 2));
        this.cdr.detectChanges();
      } else {
        console.error('Error al obtener productos:', response.error);
      }
    });
  }

  parseDate(date: string) {
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    return formattedDate;
  }

  clearSales() {
    this.sales = [];
    this.empty = false;
    this.total = 0;
    this.cdr.detectChanges;
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
