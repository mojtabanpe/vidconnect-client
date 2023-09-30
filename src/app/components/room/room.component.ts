import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeneralService } from 'src/app/services/general.service';
import { StreamsComponent } from '../streams/streams.component';
import { Router } from '@angular/router';
import { RepositoryService } from 'src/app/services/repository.service';
import { environment } from 'src/environments/environment.prod';
import { roomOpts } from 'src/app/consts/room-config';
import { Participant, Room, RoomEvent } from 'livekit-client';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css'],
  standalone: true,
  imports: [FormsModule, StreamsComponent, NgIf]
})
export class RoomComponent implements OnInit {
  room = this.general.room as Room;
  name = this.general.name;
  token = '';
  wsUrl = environment.ws_url;
  remoteParticipants: Participant[] = [];
  initialized = false;
  constructor(private general: GeneralService, private router: Router, private repository: RepositoryService) { }

  ngOnInit() {
    if (!this.room) {
      this.router.navigate(['/login']);
    } else {
      this.initilizeTheRoom();
    }
  }

  initilizeTheRoom(): void {
    this.repository.getToken(this.room.name, this.general.name).subscribe(async res => {      
      this.token = res.access_token;
      this.room = this.general.room = new Room(roomOpts);
      this.room
      .on(RoomEvent.ParticipantConnected, this.participantConnected.bind(this))
      // this.room.options.adaptiveStream = roomOpts.adaptiveStream as boolean;
      // this.room.options.dynacast = roomOpts.dynacast as boolean;
      // this.room.options.publishDefaults = roomOpts.publishDefaults;
      // this.room.options.videoCaptureDefaults = roomOpts.videoCaptureDefaults;
      await this.room?.connect(this.wsUrl, this.token);
      this.initialized = true;
    })
  }

  participantConnected(participant: Participant) {
    console.log('participant', participant.identity, 'connectedd');

    if (participant.identity !== this.room.localParticipant.identity) {
      this.remoteParticipants.push(participant);
    }
  }


}
