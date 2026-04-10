import json
import re
from deep_translator import GoogleTranslator

keys = json.load(open('keys.json', encoding='utf-8'))

translator_en = GoogleTranslator(source='zh-CN', target='en')
translator_vi = GoogleTranslator(source='zh-CN', target='vi')

def to_snake_case(s):
    s = re.sub(r'[\W_]+', '_', s.lower()).strip('_')
    return s[:20] if len(s) > 20 else s

translations = {}
generated_keys = set()

def process_batch(batch_keys):
    for k in batch_keys:
        try:
            en_str = translator_en.translate(k)
            vi_str = translator_vi.translate(k)
            if k and vi_str: vi_str = vi_str[0].upper() + vi_str[1:] if k[0].isupper() or len(k) < 10 else vi_str

            base_key = to_snake_case(en_str)
            if not base_key: base_key = "text"
            
            final_key = f"auto.{base_key}"
            counter = 1
            while final_key in generated_keys:
                final_key = f"auto.{base_key}_{counter}"
                counter += 1
                
            generated_keys.add(final_key)
            translations[k] = { "key": final_key, "en": en_str, "vi": vi_str }
            print(final_key)
        except Exception as e:
            translations[k] = { "key": f"auto.err_{len(translations)}", "en": str(k.encode('utf-8')), "vi": str(k.encode('utf-8')) }

print("Translating...", len(keys))
batch_size = 15
for i in range(0, len(keys), batch_size):
    process_batch(keys[i:i+batch_size])

with open('translation_map.json', 'w', encoding='utf-8') as f:
    json.dump(translations, f, ensure_ascii=False, indent=2)

print("Map created.")
