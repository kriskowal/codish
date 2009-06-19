
from StringIO import StringIO
import string

definitions = {}

def define(name, value, context=None):
    lines = StringIO(value.__doc__)
    forms = []
    definition = []
    if isinstance(value, type):
        if issubclass(value, Exception):
            definition.append('an [exception], %r' % " ".join(map(string.strip, lines)))
        else:
            for subname, value in vars(value).items():
                if value.__doc__ is None: continue
                if subname.startswith('__'):
                    continue
                define(subname, value, name)
    for line in lines:
        line = line.strip()
        if line.endswith(':'):
            break
        elif '->' in line:
            forms.append('{{{%s}}}' % line.replace('-->', '->'))
        elif ' -- ' in line:
            example, meaning = line.split(' -- ', 1)
            forms.append('{{{%s}}} %s' % (example, meaning))
        else:
            definition.append(line)
    definitions.setdefault(name, []).append({
        'name': name,
        'forms': forms,
        'definition': " ".join(definition).strip(),
        'context': context,
    })

for name in dir(__builtins__):
    if name.startswith('__'):
        continue
    value = getattr(__builtins__, name);
    if value.__doc__ is None:
        continue
    define(name, value)

for name, definitions in definitions.items():
    for definition in definitions:
        forms = definition['forms']
        parts = [name + ':', 'python:']
        if definition['context']:
            parts.append('[%s]: ' % definition['context'])
        if forms:
            parts.append('; '.join(forms))
        parts.append(definition['definition'])
        print " ".join(parts)
