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
  isSpeaker: boolean,
  isSpeaking: boolean
}

@Component({
  selector: 'app-streams',
  templateUrl: './streams.component.html',
  styleUrls: ['./streams.component.css'],
  standalone: true,
  imports: [NgFor, NgIf]
})
export class StreamsComponent implements OnChanges {
  room: Room = this.general.room as Room;
  @Input() participants: Array<RemoteParticipant> = [];
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
   }

  ngOnChanges() {
    setTimeout(() => {
      this.initial();
    }, 300);
  }

  async initial(): Promise<void> {
    await this.room!.localParticipant.setCameraEnabled(true).catch(() => {
      console.log("camera cant access");  
    });
    await this.room!.localParticipant.setMicrophoneEnabled(true).catch(() => {
      console.log("mic cant access");  
    });
  }

  handleLocalTrackPublished(trackPublication: LocalTrackPublication, localParticipant: LocalParticipant): void {
    const track = trackPublication.track as Track;
    const id = localParticipant.identity + track.kind + track.sid;
    if (trackPublication.kind === Track.Kind.Video) {
      if (trackPublication.source === Track.Source.Camera) {
        this.localStreamId = id;
      }
      const stream = {
        id,
        class: 'd-none', 
        isMuted: this.isMuted,
        name: localParticipant.identity,
        isSpeaker: false,
        isSpeaking: false
      };
      this.streams.push(stream);
      stream.class = this.decideForResolutionClass(id);
      this.cdrf.detectChanges();
      const element = track.attach();
      element.id = id;
      element.style.width = '100%';
      setTimeout(() => {
        const elementConatainer = document.getElementById(id + '-container');
        elementConatainer?.appendChild(element);
        this.toggleCameraView(this.localStreamId);
      }, 0);
    } else {
      this.toggleMicView();
      const stream = this.streams.find(s => s.id === this.localStreamId);
      if (stream) {
        stream.isMuted = false;
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
      this.toggleMicView();
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
        this.toggleMicView(stream.id);
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
        this.toggleMicView(stream.id);
      }
    }
  }

  handleTrackUnmute(publication: TrackPublication, participant: Participant): void {
    const stream = this.streams.find(s => s.id.includes(participant.identity + 'video'));
    if (publication.track?.kind === Track.Kind.Video) {
      this.renderVideoTrack(publication.track as RemoteTrack, participant);
    } else { 
        if (stream) {
          this.toggleMicView(stream.id);
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
    
    const stream: Stream = {
      id,
      class: 'd-none',
      isMuted: true,
      name: ((track.source === Track.Source.ScreenShare) ? 'تصویر اشتراکی ' : '') + participant.name,
      isSpeaker: false,
      isSpeaking: false,
    };
    this.streams.push(stream);
    stream.class = this.decideForResolutionClass(id);
    this.cdrf.detectChanges();
    const element = track.attach();
    element.id = id;
    element.style.width = '100%';
    setTimeout(() => {
      const elementConatainer = document.getElementById(id + '-container');
      elementConatainer?.appendChild(element);
    }, 0);

  }

  decideForResolutionClass(streamId: string, mode = 'afterAdd'): string {
    const stream = this.streams.find(s => s.id === streamId);
    let streamClass = '';
    if (stream?.isSpeaker) {
      streamClass = 'speaker';
    } else {
      streamClass = 'normal-user';
    }
    streamClass += this.findSecondClass(mode, streamId);
    return streamClass;
  }

  findSecondClass(mode: string, streamId: string): string {
    let streamLength = this.streams.length;
    if (mode === 'beforeAdd') {
      streamLength++;
    }

    this.general.changeStreamsCounter(streamLength);
    this.changeAllStreamsContainerClass();
    switch (streamLength) {
      case 1:
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker alone';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user alone';
            }
          }
        });
        return ' alone';
      case 2:
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker two-person';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user two-person';
            }
          }
        });
        return ' two-person';
      case 3:
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker three-person';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user three-person';
            }
          }
        });
        return ' three-person';
      case 4:
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker four-person';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user four-person';
            }
          }
        });
        return ' four-person';
      case (5):
      case (6):
      case (7):
      case (8):
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker five-to-nine-person';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user five-to-nine-person';
            }
          }
        });
        return ' five-to-nine-person';
      case (9):
      case (10):
      case (11):
      case (12):
      case (13):
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker nine-to-thirteen-person';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user nine-to-thirteen-person';
            }
          }
        });
        return ' nine-to-thirteen-person';
      case (14):
      case (15):
      case (16):
      case (17):
      case (18):
      case (19):
      case (20):
      case (21):
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker thirteen-to-21-person';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user thirteen-to-21-person';
            }
          }
        });
        return ' thirteen-to-21-person';
      default:
        this.streams.forEach(stream => {
          if (stream.class.includes('speaker')) {
            stream.class = 'speaker more-than-21-person';
          } else {
            if (stream.id !== streamId) {
              stream.class = 'normal-user more-than-21-person';
            }
          }
        });
        return ' more-than-21-person';
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

  async toggleMic(streamId: string): Promise<void> {
    if (this.localStreamId !== streamId) {
      return;
    }
    if (this.room.localParticipant.isMicrophoneEnabled) {
      await this.room.localParticipant.setMicrophoneEnabled(false);
    } else {
      await this.room.localParticipant.setMicrophoneEnabled(true);
    }
  }

  async toggleCamera(streamId: string): Promise<void> {
    if (this.localStreamId !== streamId) {
      return;
    }
    if (this.room.localParticipant.isCameraEnabled) {
      await this.room.localParticipant.setCameraEnabled(false);
    } else {
      await this.room.localParticipant.setCameraEnabled(true);
    }
  }

  toggleCameraView(streamId: string): void {
    const cameraElement = document.getElementById(streamId + '-camera');
    if (cameraElement?.classList.contains('on')) {
      cameraElement.classList.remove('on');
      cameraElement.classList.add('off');
    } else {
      cameraElement?.classList.remove('off');
      cameraElement?.classList.add('on');
    }
  }

  toggleMicView(streamId: string = this.localStreamId): void {
    const micElement = document.getElementById(streamId + '-mic');
    if (micElement?.classList.contains('on')) {
      micElement.classList.remove('on');
      micElement.classList.add('off');
    } else {
      micElement?.classList.remove('off');
      micElement?.classList.add('on');
    }
  }

  pinStream(streamId: string): void {
    const previousSpeakerStream = this.streams.find(s => s.isSpeaker === true);
    if (previousSpeakerStream && this.room) {
      previousSpeakerStream.isSpeaker = false;
      previousSpeakerStream.class = this.decideForResolutionClass(previousSpeakerStream.id);
    }

    const speakerStream = this.getStramById(streamId);

    if (speakerStream) {
      speakerStream.isSpeaker = true;
      speakerStream.class = this.decideForResolutionClass(speakerStream.id);
    }
  }

  unPin(streamId: string): void {
    const previousSpeakerStream = this.streams.find(s => s.isSpeaker === true);
    if (previousSpeakerStream && this.room) {
      previousSpeakerStream.isSpeaker = false;
      previousSpeakerStream.class = this.decideForResolutionClass(previousSpeakerStream.id);
    }
  }
  
  getStramById(streamId: string): Stream | undefined{
    const stream = this.streams.find(s => s.id === streamId);
    return stream;
  }

  changeAllStreamsContainerClass(): void {
    const streamsContainer = document.getElementById('all-streams');
    if (streamsContainer) {
      if (this.streams.length < 14) {
        streamsContainer.style.gridTemplateColumns = 'repeat(8, 12.5%)';
        streamsContainer.style.gridTemplateRows = 'repeat(8, 12.5%)';
      } else if (this.streams.length > 13 && this.streams.length < 22) {
        streamsContainer.style.gridTemplateColumns = 'repeat(6, 16.66%)';
        streamsContainer.style.gridTemplateRows = 'repeat(6, 16.66%)';
      } else if (this.streams.length > 21) {
        streamsContainer.style.gridTemplateColumns = 'repeat(7, 14.28%)';
        streamsContainer.style.gridTemplateRows = 'repeat(7, 14.28%)';
      }
    }
  }
}
