import { CommonModule, NgFor } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RemoteParticipant } from 'livekit-client';
import { GeneralService } from 'src/app/services/general.service';

@Component({
  selector: 'app-participants',
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.css'],
  standalone: true,
  imports: [NgFor, FormsModule, CommonModule]
})
export class ParticipantsComponent implements OnInit, OnChanges {
  @Input() participants: RemoteParticipant[] = [];
  localParticipant = this.general.room?.localParticipant;
  constructor(private general: GeneralService) { }

  ngOnInit() {
    console.log(this.localParticipant?.name);
    
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log(this.participants);
    
  }

}
