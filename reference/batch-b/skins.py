"""Cosmetic tool skins (Nano Banana 2 edits of the approved base tool masters, standard resolution).
Same silhouette / orientation / framing as the base, so the base cutout alpha and working point are
reused (no background removal)."""
import json
import sys

SKIN = ("Edit the reference image. Keep the exact same {N}: identical shape, silhouette, size, position, orientation, camera and framing, "
        "and the same plain flat light gray background. Change only the colors and materials: {C} No text, no logos, no cast shadow on the background.")

# skin id -> (base master job, noun, change)
SKINS = {
    'washer-red': ('42692379-3210-4013-80c8-7ed6bda96c35', 'pressure washer lance', "a glossy fire-red gun body and wand with black accents."),
    'washer-neon': ('42692379-3210-4013-80c8-7ed6bda96c35', 'pressure washer lance', "a glossy neon cyan and electric blue body and wand with bright accents."),
    'washer-candy': ('42692379-3210-4013-80c8-7ed6bda96c35', 'pressure washer lance', "playful glossy candy colors: bubblegum pink body, mint green wand and white stripes."),
    'scrub-wood': ('8a846bb8-153a-4e5e-bf3b-63907e0da262', 'scrub brush', "a natural varnished light wood back with cream bristles."),
    'scrub-pink': ('8a846bb8-153a-4e5e-bf3b-63907e0da262', 'scrub brush', "a glossy bubblegum pink back with white bristles."),
    'scrub-gold': ('8a846bb8-153a-4e5e-bf3b-63907e0da262', 'scrub brush', "a polished shiny gold back with white bristles."),
    'foam-candy': ('450a026b-545b-49d1-bd3c-b1455fb6d9fb', 'foam sprayer', "playful glossy candy colors: pink and mint green with white details."),
    'foam-neon': ('450a026b-545b-49d1-bd3c-b1455fb6d9fb', 'foam sprayer', "a glossy neon lime green and black body."),
    'foam-gold': ('450a026b-545b-49d1-bd3c-b1455fb6d9fb', 'foam sprayer', "polished shiny gold with glossy black details."),
    'screw-blue': ('52fd17ec-bd4e-4b7a-91be-e80c3c259d18', 'screwdriver', "a transparent royal blue and black handle, the same chrome shaft."),
    'screw-industrial': ('52fd17ec-bd4e-4b7a-91be-e80c3c259d18', 'screwdriver', "an industrial safety-yellow and black handle, the same chrome shaft."),
    'screw-neon': ('52fd17ec-bd4e-4b7a-91be-e80c3c259d18', 'screwdriver', "a glossy neon green and black handle, the same chrome shaft."),
    'hammer-construction': ('93161e16-b5ca-4e8f-acf6-946769af0244', 'claw hammer', "a construction style: dark steel head and a safety-yellow and black rubber grip handle."),
    'hammer-toy': ('93161e16-b5ca-4e8f-acf6-946769af0244', 'claw hammer', "a playful toy style: glossy red plastic head and a blue and yellow striped handle."),
    'hammer-red': ('93161e16-b5ca-4e8f-acf6-946769af0244', 'claw hammer', "a polished steel head and a glossy fire-red handle with a black end cap."),
    'grinder-red': ('7865abf5-0b15-4618-aab2-2caaa085cdcb', 'angle grinder', "a glossy fire-red and black motor body and battery, the same disc."),
    'grinder-neon': ('7865abf5-0b15-4618-aab2-2caaa085cdcb', 'angle grinder', "a glossy neon blue and black motor body and battery, the same disc."),
    'grinder-industrial': ('7865abf5-0b15-4618-aab2-2caaa085cdcb', 'angle grinder', "an industrial safety-yellow and black motor body and battery, the same disc."),
    'polisher-pink': ('2ddae8db-4ecc-4023-8ed3-68e3b438f28c', 'rotary polishing machine', "a glossy candy pink and white body with a pink wool pad."),
    'polisher-blue': ('2ddae8db-4ecc-4023-8ed3-68e3b438f28c', 'rotary polishing machine', "a glossy electric blue and black body with a white wool pad."),
    'polisher-chrome': ('2ddae8db-4ecc-4023-8ed3-68e3b438f28c', 'rotary polishing machine', "a polished chrome and white body with a light gray wool pad."),
    # laser skins: base = the new laser master
    'laser-redblack': ('LASER', 'laser cleaning gun', "a glossy red and black body with a red lens."),
    'laser-blue': ('LASER', 'laser cleaning gun', "a futuristic glossy white and electric blue body with a blue lens and blue light strips."),
    'laser-gold': ('LASER', 'laser cleaning gun', "a premium polished gold and black body with a gold nozzle."),
}

if __name__ == '__main__':
    laser = sys.argv[1] if len(sys.argv) > 1 else 'LASER'
    out = []
    for i, (k, (job, n, c)) in enumerate(SKINS.items()):
        out.append({'index': i, 'key': k, 'params': {'model': 'nano_banana_2', 'aspect_ratio': 'auto', 'folder_id': '21f4df55-05f7-4bef-a8c3-a68d58b70adb',
                    'medias': [{'role': 'image_references', 'value': laser if job == 'LASER' else job}], 'prompt': SKIN.format(N=n, C=c)}})
    print(json.dumps(out, ensure_ascii=False))
