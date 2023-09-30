import { Routes } from '@angular/router';
import { RoomComponent } from './components/room/room.component';
import { LoginComponent } from './components/login/login.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full'},
    { path: 'room', component: RoomComponent},
    { path: 'login', component: LoginComponent},
];
