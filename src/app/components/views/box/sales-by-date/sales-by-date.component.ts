import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sales-by-date',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './sales-by-date.component.html',
  styleUrl: './sales-by-date.component.css'
})
export class SalesByDateComponent {
  sales: any[] = [];
  date: string = "";
  empty: boolean = false;
  
  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() { }

  getSalesByDate() {
    this.clearSales();

    window.electron.send('get-sales-by-date', this.date);

    window.electron.receive('get-sales-by-date-response', (response: any) => {
      console.log(JSON.stringify(response, null, 2))
      if (response.success) {
        if (response.data.length < 1) {
          this.empty = true;
        } else {
          this.sales = response.data
          for (let sale of this.sales) {
            const { formattedDate, formattedTime } = this.parseDateAndTime(sale.date);
            sale.formattedDate = formattedDate;
            sale.formattedTime = formattedTime;
          }
        }
        this.cdr.detectChanges();
      } else {
        console.error('Error al obtener productos:', response.error);
      }
    });
  }

  parseDate(date: string) {
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}-${month}-${year}`;
    return formattedDate;
  }

  clearSales() {
    this.sales = [];
    this.empty = false;
  }

  parseDateAndTime(isoString: string) {
    const date = new Date(isoString);

    const offsetDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);

    const day = String(offsetDate.getUTCDate()).padStart(2, '0');
    const month = String(offsetDate.getUTCMonth() + 1).padStart(2, '0');
    const year = offsetDate.getUTCFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    const hours = String(offsetDate.getUTCHours()).padStart(2, '0');
    const minutes = String(offsetDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(offsetDate.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(offsetDate.getUTCMilliseconds()).padStart(3, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}.${milliseconds}`;

    return { formattedDate, formattedTime };
  }
}
