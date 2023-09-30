import { Injectable } from '@angular/core';
import { Room } from 'livekit-client';

@Injectable({
  providedIn: 'root'
})
export class GeneralService {
room: Room | undefined;
name = '';
constructor() { }

}
