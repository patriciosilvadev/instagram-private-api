import { omit, defaultsDeep, random } from 'lodash';
import { DateTime } from 'luxon';
import { Repository } from '../core/repository';
import { LikeRequestOptions, MediaLikeOrUnlikeOptions, UnlikeRequestOptions } from '../types/media.like.options';
import { MediaRepositoryLikersResponseRootObject } from '../responses';
import { MediaConfigureOptions } from '../types/media.configure.options';

export class MediaRepository extends Repository {
  private async likeAction(options: MediaLikeOrUnlikeOptions) {
    const signedFormData = this.client.request.signPost({
      module_name: options.moduleInfo.module_name,
      media_id: options.mediaId,
      _csrftoken: this.client.state.CSRFToken,
      ...omit(options.moduleInfo, 'module_name'),
      radio_type: 'wifi-none',
      _uid: await this.client.state.extractCookieAccountId(),
      device_id: this.client.state.deviceId,
      _uuid: this.client.state.uuid,
    });

    return this.client.request.send({
      url: `/api/v1/media/${options.mediaId}/${options.action}/`,
      method: 'POST',
      form: {
        ...signedFormData,
        d: options.d,
      },
    });
  }
  public async like(options: LikeRequestOptions) {
    return this.likeAction({
      action: 'like',
      ...options,
    });
  }
  public async unlike(options: UnlikeRequestOptions) {
    return this.likeAction({
      action: 'unlike',
      ...options,
    });
  }
  public async likers(id: string): Promise<MediaRepositoryLikersResponseRootObject> {
    const { body } = await this.client.request.send<MediaRepositoryLikersResponseRootObject>({
      url: `/api/v1/media/${id}/likers`,
    });
    return body;
  }

  public async uploadFinish(options: { upload_id: string; source_type: string }) {
    return this.client.request.send({
      url: '/api/v1/media/upload_finish/',
      method: 'POST',
      headers: {
        retry_context: JSON.stringify({ num_step_auto_retry: 0, num_reupload: 0, num_step_manual_retry: 0 }),
      },
      form: this.client.request.signPost({
        timezone_offset: this.client.state.timezoneOffset,
        _csrftoken: this.client.state.CSRFToken,
        source_type: options.source_type,
        _uid: await this.client.state.extractCookieAccountId(),
        device_id: this.client.state.deviceId,
        _uuid: this.client.state.uuid,
        upload_id: options.upload_id,
        device: this.client.state.devicePayload,
      }),
    });
  }

  public async configure(options: MediaConfigureOptions) {
    const devicePayload = this.client.state.devicePayload;
    const now = DateTime.local().toFormat('yyyy:mm:dd HH:mm:ss');
    const width = options.width || 1520;
    const height = options.height || 2048;

    const form = defaultsDeep(options, {
      date_time_digitalized: now,
      camera_model: devicePayload.model,
      scene_capture_type: 'standard',
      timezone_offset: this.client.state.timezoneOffset,
      _csrftoken: this.client.state.CSRFToken,
      media_folder: 'Camera',
      source_type: '4',
      _uid: await this.client.state.extractCookieAccountId(),
      device_id: this.client.state.deviceId,
      _uuid: this.client.state.uuid,
      creation_logger_session_id: this.client.state.sessionId,
      caption: '',
      date_time_original: now,
      software: '1',
      camera_make: devicePayload.manufacturer,
      device: devicePayload,
      edits: {
        crop_original_size: [width, height],
        crop_center: [0.0, -0.0],
        crop_zoom: random(1.01, 1.99).toFixed(7),
      },
      extra: { source_width: width, source_height: height },
    });

    this.client.request.send({
      url: '/api/v1/media/configure/',
      method: 'POST',
      form: this.client.request.signPost(form),
    });
  }
}
