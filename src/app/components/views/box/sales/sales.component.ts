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
