import jsfeat from 'jsfeat'
import Bar from './Bar'
import 'webrtc-adapter'
const WIDTH = 480
const HEIGHT = 360
const SCANLINE_SIZE = 30
const SCANLINE_SPEED = 10

export default {
	template: require('./app.jade'),
	components: {bar: Bar},
	data() {
		return {
			_ctx1: {},
			_ctx2: {},
			img_u8: new jsfeat.matrix_t(WIDTH, HEIGHT, jsfeat.U8C1_t),
			img_gxgy: new jsfeat.matrix_t(WIDTH, HEIGHT, jsfeat.S32C2_t),
			img_mag: new jsfeat.matrix_t(WIDTH, HEIGHT, jsfeat.S32C1_t),
			scanline: 0,
			person1: {
				happy: 0,
				appalled: 0,
				suprised: 0,
				angry: 0,
				happyNoise: 0,
				appalledNoise: 0,
				suprisedNoise: 0,
				angryNoise: 0
			},
			person2: {
				happy: 0,
				appalled: 0,
				suprised: 0,
				angry: 0,
				happyNoise: 0,
				appalledNoise: 0,
				suprisedNoise: 0,
				angryNoise: 0
			}
		}
	},
	methods: {
		tick() {
			let video1 = this.$els.video1
			let video2 = this.$els.video2
			let ctx1 = this._ctx1
			let ctx2 = this._ctx2
			let img_u8 = this.img_u8
			let img_gxgy = this.img_gxgy
			let img_mag = this.img_mag
			let scanline = this.scanline

			let drawVid = (video, ctx) => {
					ctx.drawImage(video, 0, 0, WIDTH, HEIGHT)
					let imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT)
					jsfeat.imgproc.grayscale(imageData.data, WIDTH, HEIGHT, img_u8)
					// jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 3)
					jsfeat.imgproc.sobel_derivatives(img_u8, img_gxgy)

					var data_u32 = new Uint32Array(imageData.data.buffer);
					var alpha = (0xff << 24);

					var i = img_u8.cols*img_u8.rows, pix=0, gx = 0, gy = 0;
					while(--i >= 0) {
						if(i/img_u8.cols > (scanline - SCANLINE_SIZE/2) && i/img_u8.cols < scanline + SCANLINE_SIZE/2 || i%img_u8.cols > (scanline - SCANLINE_SIZE/2) && i%img_u8.cols < scanline + SCANLINE_SIZE/2 ) {
							gx = Math.abs(img_gxgy.data[i<<1]>>0)&0xff;
							gy = Math.abs(img_gxgy.data[(i<<1)+1]>>0)&0xff;
							pix = ((gx + gy)>>1)&0xff;
							data_u32[i] = alpha | pix | (gx << 16) | (gx << 8) | gy
						}
					}

					ctx.putImageData(imageData, 0, 0);
			}
			if (video1.readyState === video1.HAVE_ENOUGH_DATA)
				drawVid(video1, ctx1)
			if (video2.readyState === video2.HAVE_ENOUGH_DATA)
				drawVid(video2, ctx2)
			this.scanline += SCANLINE_SPEED
			if(this.scanline > HEIGHT + 200)
				this.scanline = 0


			this.person1.happyNoise = Math.random() * 0.1
			this.person1.suprisedNoise = Math.random() * 0.1
			this.person1.angryNoise = Math.random() * 0.1
			this.person1.appalledNoise = Math.random() * 0.1

			this.person2.happyNoise = Math.random() * 0.1
			this.person2.suprisedNoise = Math.random() * 0.1
			this.person2.angryNoise = Math.random() * 0.1
			this.person2.appalledNoise = Math.random() * 0.1

			requestAnimationFrame(this.tick)
		}
	},
	ready() {
		navigator.mediaDevices.enumerateDevices().then((devices) => {
			console.log(devices)
		})
		let constraints = { audio: false, video: { deviceId:{exact: 'a9215d73fcb9d6e8b0c940c446eab61abe584d3892bf7091a093318ba6d64679'}} }
		navigator.getUserMedia(constraints, function(stream) {
			var video1 = document.querySelector('#video1')
			video1.src = window.URL.createObjectURL(stream)
			video1.onloadedmetadata = function(e) {
				video1.play();
			}
		}, function(err) {
			console.log(err.name + ": " + err.message);
		})
		constraints = { audio: false, video: { deviceId:{exact: 'a5215ac87d0e8c4e468aeb45e3547a4f2b9190779f41b0b3c10ff79d175161c6'}} }
		navigator.getUserMedia(constraints, function(stream) {
			var video2 = document.querySelector('#video2')
			video2.src = window.URL.createObjectURL(stream)
			video2.onloadedmetadata = function(e) {
				video2.play();
			}
		}, function(err) {
			console.log(err.name + ": " + err.message);
		})

		this._ctx1 = this.$els.canvas1.getContext('2d')
		this._ctx1.fillStyle = "rgb(0,255,0)";
		this._ctx1.strokeStyle = "rgb(0,255,0)";

		this._ctx2 = this.$els.canvas2.getContext('2d')
		this._ctx2.fillStyle = "rgb(0,255,0)";
		this._ctx2.strokeStyle = "rgb(0,255,0)";

		var m = null; // m = MIDIAccess object for you to make calls on


		let onsuccesscallback = (access) => {
			m = access;

			var inputs = m.inputs

			let input
			for(input of inputs.values())
				if(input.name.indexOf("nanoKONTROL") == 0)
					break

			console.log(inputs, input)
			input.onmidimessage = (event) => {
				let data = event.data
				let feels = ''
				switch(data[1]) {
					case 2: feels = 'happy'; break
					case 3: feels = 'suprised'; break
					case 4: feels = 'angry'; break
					case 5: feels = 'appalled'; break
				}
				this.person1[feels] = data[2]/127
				feels = ''
				switch(data[1]) {
					case 8: feels = 'happy'; break
					case 9: feels = 'suprised'; break
					case 12: feels = 'angry'; break
					case 13: feels = 'appalled'; break
				}
				this.person2[feels] = data[2]/127
			}
		};

		function onerrorcallback( err ) {
			console.log( "uh-oh! Something went wrong! Error code: " + err.code );
		}
		navigator.requestMIDIAccess().then( onsuccesscallback, onerrorcallback );
		requestAnimationFrame(this.tick)
	}
}
