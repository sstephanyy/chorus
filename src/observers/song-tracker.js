import { currentData } from '../data/current.js'
import { songState } from '../data/song-state.js'
import { spotifyVideo } from '../actions/overload.js'

import { request } from '../utils/request.js'
import { timeToSeconds } from '../utils/time.js'
import { highlightElement } from '../utils/higlight.js'

export default class SongTracker {
    constructor() {
        this._currentSongState = null
        this._video = spotifyVideo.element
    }

    async init() {
        this.#setupListeners()
        await this.songChange()
    }

    set currentSongState(values) {
        if (!values) return
        if (!this._currentSongState) return

        this._currentSongState = {
            ...this._currentSongState,
            ...values,
        }
    }

    get #isLooping() {
        const repeatButton = document.querySelector('[data-testid="control-button-repeat"]')
        return repeatButton?.getAttribute('aria-label') === 'Disable repeat'
    }

    async #seekTo(position) {
        await request({ 
            type: 'seek',
            value: Math.max(parseInt(position, 10) - 1, 1) * 1000,
            cb: () => { this.#mute(); setTimeout(() =>  this._video.volume = 1, 1000) }
        })
    }

    #mute() { this._video.volume = 0 }

    #setupListeners() {
        this._video.element.addEventListener('timeupdate', this.#handleTimeUpdate)
    }

    clearListeners() {
        this._video.element.removeEventListener('timeupdate', this.#handleTimeUpdate)
    }

    async #applyEffects({ isShared, isSnip, playbackRate, preservesPitch }) {
        const { preferredRate, preferredPitch, track } = await currentData.getPlaybackValues()
        this._video.currentSpeed = isShared ? playbackRate : preferredRate
        this._video.playbackRate = this._video.currentSpeed
        this._video.preservesPitch = isShared ? preservesPitch : preferredPitch

        highlightElement({ 
            selector: '#chorus-icon > svg', 
            songStateData: { isSnip, isShared, ...track }
        })
    }

    async #setCurrentSongData() {
        const songStateData = await songState()
        this._currentSongState = songStateData
        return songStateData
    }

    async songChange() {
        const songStateData = await this.#setCurrentSongData()
        await this.#applyEffects(songStateData)
        const { isSnip, isSkipped, startTime, isShared } = songStateData

        if (isSkipped) {
            this.#nextButton.click()
            return
        } else if (isSnip || isShared) {
            const parsedStartTime = parseInt(startTime, 10) * 1000
            const currentPosition = timeToSeconds(this.#playbackPosition?.textContent || '0:00')
            const currentPositionTime = parseInt(currentPosition, 10) * 1000

            if (currentPositionTime < parsedStartTime) {
                await this.#seekTo(startTime)
            }
        } else {
            this._video.volume = 1
        }
    }

    get #nextButton() {
        return document.querySelector('[data-testid="control-button-skip-forward"]')
    }

    get #playbackPosition() {
        return document.querySelector('[data-testid="playback-position"]')
    }

    #handleTimeUpdate = () => {
        if (this._video.isEditing) return
        if (!this._currentSongState) return

        setTimeout(() => {
            const { startTime, endTime } = this._currentSongState
            const currentTimeMS = parseInt(this._video.currentTime * 1000, 10)

            const endTimeMS = parseInt(endTime, 10) * 1000 - 500
            const atSongEnd = currentTimeMS >= endTimeMS
            if (!atSongEnd) return

            if (this.#isLooping) {
                this._video.currentTime = { source: 'chorus', value: startTime }
                return
            }

            this.#nextButton.click()
        }, 1000)
    }
}
