import jsfeat from 'jsfeat'
import Bar from './Bar'

const HEIGHT = 480
const SCANLINE_SIZE = 30
const SCANLINE_SPEED = 10

export default {
	template: require('./app.jade'),
	components: {bar: Bar},
	data() {
		return {
			_ctx: {},
			img_u8: new jsfeat.matrix_t(640, HEIGHT, jsfeat.U8C1_t),
			img_gxgy: new jsfeat.matrix_t(640, HEIGHT, jsfeat.S32C2_t),
			img_mag: new jsfeat.matrix_t(640, HEIGHT, jsfeat.S32C1_t),
			scanline: 0,
			happy: 0,
			sad: 0,
			suprised: 0,
			angry: 0,
			happyNoise: 0,
			sadNoise: 0,
			suprisedNoise: 0,
			angryNoise: 0
		}
	},
	methods: {
		tick() {
			let video = this.$els.video
			let ctx = this._ctx
			let img_u8 = this.img_u8
			let img_gxgy = this.img_gxgy
			let img_mag = this.img_mag
			let scanline = this.scanline

			if (video.readyState === video.HAVE_ENOUGH_DATA) {
				ctx.drawImage(video, 0, 0, 640, 480)
				let imageData = ctx.getImageData(0, 0, 640, 480)
				jsfeat.imgproc.grayscale(imageData.data, 640, 480, img_u8)
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

				this.scanline += SCANLINE_SPEED
				if(this.scanline > HEIGHT + 200)
					this.scanline = 0

				this.happyNoise = Math.random() * 0.1
				this.suprisedNoise = Math.random() * 0.1
				this.angryNoise = Math.random() * 0.1
				this.sadNoise = Math.random() * 0.1
			}
			requestAnimationFrame(this.tick)
		}
	},
	ready() {
		let constraints = { audio: true, video: { width: 1280, height: 720 } };

		navigator.webkitGetUserMedia(constraints, function(stream) {
			var video = document.querySelector('video');
			video.src = window.URL.createObjectURL(stream);
			video.onloadedmetadata = function(e) {
				video.play();
			};
		}, function(err) {
			console.log(err.name + ": " + err.message);
		});

		this._ctx = this.$els.canvas.getContext('2d')
		this._ctx.fillStyle = "rgb(0,255,0)";
		this._ctx.strokeStyle = "rgb(0,255,0)";

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
					case 5: feels = 'sad'; break
				}
				this[feels] = data[2]/127
			}
		};

		function onerrorcallback( err ) {
			console.log( "uh-oh! Something went wrong! Error code: " + err.code );
		}
		navigator.requestMIDIAccess().then( onsuccesscallback, onerrorcallback );
		requestAnimationFrame(this.tick)
	}
}
