import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { GeneralService } from 'src/app/services/general.service';
import { RepositoryService } from 'src/app/services/repository.service';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [FormsModule]
})
export class LoginComponent implements OnInit {
  router = inject(Router);
  name = 'mojtaba';
  roomName = 'chom';
  constructor(private repository: RepositoryService, private alert: ToastrService, private general: GeneralService) { }

  ngOnInit() {
  }

  createRoom(): void {
    if (this.name === '') {
      this.alert.error('please fill the name');
      return;
    }
    const uid = uuid();
    this.repository.createRoom(uid).subscribe(room => {
      this.alert.success('Room Created!');
      this.general.room = room;
      this.general.name = this.name;
      this.router.navigate(['/room']);
    });
  }

  loginToRoom(): void {
    if (this.roomName === '') {
      this.alert.error('please fill the room token');
      return;
    }
    if (this.name === '') {
      this.alert.error('please fill the name');
      return;
    }
    this.repository.getRoom(this.roomName).subscribe(room => {
      this.general.room = room;
      this.general.name = this.name;
      this.router.navigate(['/room']);
    })
  }

  
}
