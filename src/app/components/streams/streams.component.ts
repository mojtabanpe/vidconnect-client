import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core';
import { LocalParticipant, LocalTrackPublication, Participant, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Room, RoomEvent, Track, TrackPublication } from 'livekit-client';
import { GeneralService } from 'src/app/services/general.service';
import { RepositoryService } from 'src/app/services/repository.service';



interface Stream {
  id: string,
  class: string,
  isMuted: boolean,
  name: string,
  isSpeaker: boolean
}

@Component({
  selector: 'app-streams',
  templateUrl: './streams.component.html',
  styleUrls: ['./streams.component.css'],
  standalone: true,
  imports: [NgFor]
})
export class StreamsComponent implements OnChanges {
  room: Room = this.general.room as Room;
  @Input() participants: Array<Participant> = [];
  isMuted = true;
  streams: Array<Stream> = [];
  localStreamId = "";
  encoder = new TextEncoder();
  constructor(private general: GeneralService, private cdrf: ChangeDetectorRef, private repository: RepositoryService) {
    this.room
    .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this))
    .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnSubscribed.bind(this))
    .on(RoomEvent.LocalTrackPublished, this.handleLocalTrackPublished.bind(this))
    .on(RoomEvent.LocalTrackUnpublished, this.handleLocalTrackUnPublished.bind(this))
    .on(RoomEvent.TrackMuted, this.handleTrackMuted.bind(this))
    .on(RoomEvent.TrackUnmuted, this.handleTrackUnmute.bind(this))
    .on(RoomEvent.ParticipantMetadataChanged, this.handleParticipantMetadataChanged.bind(this))
    .on(RoomEvent.RoomMetadataChanged, this.handleUpdateRoomMetaData.bind(this));
   }

  ngOnChanges() {
    this.initial();
  }

  async initial(): Promise<void> {
    await this.room!.localParticipant.setCameraEnabled(true);
    await this.room!.localParticipant.setMicrophoneEnabled(true);
  }

  handleLocalTrackPublished(trackPublication: LocalTrackPublication, localParticipant: LocalParticipant): void {
    const track = trackPublication.track as Track;
    const id = localParticipant.identity + track.kind + track.sid;
    if (trackPublication.kind === Track.Kind.Video) {
      if (trackPublication.source === Track.Source.Camera) {
        this.localStreamId = id;
      }
      const resolutionClass = this.decideForResolutionClass(localParticipant);
      this.streams.push({
        id,
        class: resolutionClass, 
        isMuted: this.isMuted,
        name: localParticipant.identity,
        isSpeaker: localParticipant.isSpeaking
      });
      this.cdrf.detectChanges();
      const element = track.attach();
      element.id = id;
      element.style.width = '100%';
      setTimeout(() => {
        const elementConatainer = document.getElementById(id + '-container');
        elementConatainer?.appendChild(element);
      }, 0);
    } else {
      this.isMuted = false;
      const stream = this.streams.find(s => s.id === this.localStreamId);
      if (stream) {
        stream.isMuted = false;
        stream.class = this.decideForResolutionClass(localParticipant);
      }
    }
  }

  handleLocalTrackUnPublished(trackPublication: LocalTrackPublication, localParticipant: LocalParticipant): void {
    if (trackPublication.kind === Track.Kind.Video) {
      const index = this.streams.findIndex(s => s.id === this.localStreamId);
      if (index != -1) {
        this.streams.splice(index, 1);
      }   
    } else {
      this.isMuted = true;
      const stream = this.streams.find(s => s.id === this.localStreamId);
      if (stream) {
        stream.isMuted = true;
        stream.class = this.decideForResolutionClass(localParticipant);
      }
    }
  }

  async handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): Promise<void> {
    if (track.kind === Track.Kind.Video) {
      this.renderVideoTrack(track, participant);
    } else {
      const element = track.attach();
      element.id = track.kind + track.sid;
      const streamId = this.streams.find(s => s.id.toString().includes(participant.identity + 'video'))?.id;
      const stream = this.streams.find(s => s.id === streamId);
      if (stream) {
        stream.isMuted = false;
      }
      if (document.getElementById(element.id)) {
        return;
      }
      const parentElement = document.getElementById('all-streams')
      parentElement!.appendChild(element);
    }
  }

  handleTrackUnSubscribed(track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant): void {
    const stream = this.streams.find(s => s.id.toString().includes(participant.identity + 'video'));
    if (track.kind === Track.Kind.Video) {
      if (stream) {
        const index = this.streams.indexOf(stream);
        this.streams.splice(index, 1);
      }
    } else {
      if (stream) {
        stream.isMuted = true;
      }
    }
  }

  handleTrackMuted(publication: TrackPublication, participant: Participant): void {
    const stream = this.streams.find(s => s.id.includes(participant.identity));
    if (publication.track?.kind === Track.Kind.Video) {
      if (stream) {
        const index = this.streams.indexOf(stream);
        this.streams.splice(index, 1);
      }
    } else {
      if (stream) {
        stream.isMuted = true;
      }
    }
  }

  handleTrackUnmute(publication: TrackPublication, participant: Participant): void {
    if (publication.track?.kind === Track.Kind.Video) {
      this.renderVideoTrack(publication.track as RemoteTrack, participant);
    } else {
      const stream = this.streams.find(s => s.id.includes(participant.identity + 'video'));
        if (stream) {
          stream.isMuted = false;
        }
    }
  }

  handleParticipantMetadataChanged(metadataUnused: string | undefined, participant: RemoteParticipant | LocalParticipant): void {
    let metadata = JSON.parse(JSON.parse(participant.metadata as string));
    if (metadata.changedItem === 'isSpeaker' && metadata.isSpeaker === true) {
      const previousSpeakerStream = this.streams.find(s => s.isSpeaker === true);
      if (previousSpeakerStream && this.room) {
        const previousSpeakerParticipant = previousSpeakerStream.id === this.localStreamId ? this.room?.localParticipant :
                                            this.participants.find(p => p.identity === this.getParticpatntIdentityFromStreamId(previousSpeakerStream.id));
        if (previousSpeakerParticipant) {
          previousSpeakerStream.isSpeaker = false;
          previousSpeakerStream.class = this.decideForResolutionClass(previousSpeakerParticipant);
        }
        // const metadata = this.updateMetaData(previousSpeakerParticipant, 'isSpeaker', false);
        // this.repository.updateParticipantMetadata(this.room.name, participant.identity, JSON.stringify(metadata)).subscribe();
      }
      const spekaerStream = this.streams.find(s => s.id.includes(participant.identity));
      if (spekaerStream) {
        spekaerStream.isSpeaker = true;
        spekaerStream.class = this.decideForResolutionClass(participant);
      }
    }
    
  }

  handleUpdateRoomMetaData(newMetadata: string): void {
    let metadata = JSON.parse(JSON.parse(newMetadata));
    if (metadata.changedItem === 'muteAll') {
      const localStream = this.streams.find(s => s.id === this.localStreamId);
      if (localStream && localStream.isSpeaker === false) {
        this.room?.localParticipant.setMicrophoneEnabled(false);
        localStream.isMuted = true;
      }
    }
       
  }

  renderVideoTrack(track: RemoteTrack, participant: Participant): void {
    const id = participant.identity + track.kind + track.sid;
    const resolutionClass = this.decideForResolutionClass(participant);
    this.streams.push({
      id,
      class: resolutionClass,
      isMuted: true,
      name: participant.identity,
      isSpeaker: participant.isSpeaking
    });
    this.cdrf.detectChanges();
    const element = track.attach();
    element.id = id;
    element.style.width = '100%';
    setTimeout(() => {
      const elementConatainer = document.getElementById(id + '-container');
      elementConatainer?.appendChild(element);
    }, 0);

  }

  decideForResolutionClass(participant: Participant): string {
    const stream = this.streams.find(s => s.id.includes(participant.identity));
    if (stream?.isSpeaker) {
      return 'speaker';
    } else {
      return 'normal-user';
    }
  }

  getParticpatntIdentityFromStreamId(streamId: string): string {
    const index = streamId.indexOf('video');
    const participantId = streamId.substring(0, index);
    return participantId;
  }

  getVideoTrackIdFromStreamId(streamId: string): string {
    const index = streamId.indexOf('video') + 5;
    const trackId = streamId.substring(index, streamId.length);
    return trackId;
  }


}
