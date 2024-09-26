import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';

@Component({
  selector: 'app-promos-list',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './promos-list.component.html',
  styleUrl: './promos-list.component.css'
})
export class PromosListComponent {
  loading: boolean = false;
  empty: boolean = false;
  promos: any[] = [];
  idForDelete: number | null = null;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.send('get-promos');

      window.electron.receive('get-promos-response', (response: any) => {
        if (response.success) {
            this.promos = response.data;
            this.loading = false;
            if (this.promos.length < 1) {
              this.empty = true;
            }
            this.cdr.detectChanges();
        } else {
            console.error('Error al obtener productos:', response.error);
        }
      });
    }
  }

  deletePromo(): void {
    window.electron.send('delete-promo', this.idForDelete);

    window.electron.receive('delete-promo-response', (event: any, message: any) => {
        console.log(message);
    });

    let index = this.promos.findIndex(item => item.id === this.idForDelete);
    if (index !== -1) {
        this.promos.splice(index, 1);
    }

    if (this.promos.length < 1) {
      this.empty = true;
    }
  }

  updateIdForDelete(id: number) {
    this.idForDelete = id;
  }
}
