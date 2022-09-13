import numpy as np
from PIL import Image
import os

#only change this line to match
images_dir = "public/images/chessbot/"


out_dir = images_dir[:-1] + "_blackWhite/"
if not os.path.isdir(out_dir):
    os.mkdir(out_dir)

files = [x for x in os.listdir(images_dir) if x.endswith('.png')]
count = 0
for filename in files:
    image = Image.open(images_dir+filename)
    pix = np.array(image)

    r_layer = pix[:,:,0]
    b_layer = pix[:,:,1]
    g_layer = pix[:,:,2]

    gray_threshold = 111

    pix[(r_layer < gray_threshold) & (b_layer < gray_threshold) & (g_layer < gray_threshold)] = [7,200,17, 255]
    pix[(r_layer != 7) & (b_layer != 200) & (g_layer != 17)] = [0,0,0, 255]
    pix[(r_layer == 7) & (b_layer == 200) & (g_layer == 17)] = [255,255,255,255]

    im_new = Image.fromarray(pix)
    im_new.save(out_dir+filename)
    count += 1
    print("converted file",count,'/',len(files))
