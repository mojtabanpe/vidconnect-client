import { Injectable } from '@angular/core';
import { Room } from 'livekit-client';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeneralService {
room: Room | undefined;
name = '';
streamsCounter = new BehaviorSubject<number>(0);
currentStreamsCounter = this.streamsCounter.asObservable();
constructor() { }

changeStreamsCounter(streamsLength: number): void {
  this.streamsCounter.next(streamsLength);
}

}
