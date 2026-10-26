import io
p = r'.env'
s = io.open(p, encoding='utf-8').read()
s = s.replace('postgresql://edu_admin:change-me@localhost:5432/edu_manage',
              'postgresql://postgres:edu_manage_test@localhost:5432/edu_manage')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
