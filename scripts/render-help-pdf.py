"""Render the semantic content of ayuda.html without browser or network services."""
import json, os, re, sys
import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, LongTable, TableStyle, Image, KeepTogether

sys.stdin.reconfigure(encoding='utf-8')
data=json.load(sys.stdin)
font_dir=os.path.join(os.path.dirname(reportlab.__file__),'fonts')
for name,file in [('Manual','Vera.ttf'),('ManualBold','VeraBd.ttf'),('ManualItalic','VeraIt.ttf'),('ManualBoldItalic','VeraBI.ttf')]:
    pdfmetrics.registerFont(TTFont(name,os.path.join(font_dir,file)))
pdfmetrics.registerFontFamily('Manual',normal='Manual',bold='ManualBold',italic='ManualItalic',boldItalic='ManualBoldItalic')
body=ParagraphStyle('body',fontName='Manual',fontSize=9.2,leading=13.1,spaceAfter=6,textColor=colors.HexColor('#243444'),splitLongWords=True)
small=ParagraphStyle('small',parent=body,fontSize=7.7,leading=10.7,textColor=colors.HexColor('#50657a'))
cell=ParagraphStyle('cell',parent=body,fontSize=8,leading=11,spaceAfter=0)
headings={level:ParagraphStyle('h'+str(level),parent=body,fontName='ManualBold',fontSize={1:25,2:18,3:13,4:11}.get(level,10),leading={1:31,2:23,3:18,4:15}.get(level,14),textColor=colors.HexColor('#07578f'),spaceBefore=12,spaceAfter=7,keepWithNext=True) for level in range(1,7)}
width=A4[0]-76
def clean(text):
    return text.replace('\u00a0',' ').replace('–','-').replace('—','-').replace('‑','-').replace('→','&gt;').replace('←','&lt;').replace('↔','&lt;-&gt;')
story=[Paragraph('<a name="indice"/>',small)]
for block in data['blocks']:
    kind=block['type']
    if kind=='anchor':story.append(Paragraph('<a name="'+block['id']+'"/>',ParagraphStyle('anchor',parent=small,fontSize=1,leading=1,spaceAfter=0)))
    elif kind=='pagebreak':story.append(PageBreak())
    elif kind=='heading':story.append(Paragraph(clean(block['html']),headings[block['level']]))
    elif kind=='paragraph':
        style=small if 'doc-meta' in block.get('kind','') or 'footer-note' in block.get('kind','') else body
        story.append(Paragraph(clean(block['html']),style))
    elif kind=='table':
        count=max(map(len,block['rows']));fractions=[.24,.76] if count==2 else [.22,.29,.49] if count==3 else [1/count]*count
        rows=[[Paragraph(clean(item['html']),cell) for item in row]+['']*(count-len(row)) for row in block['rows']]
        table=LongTable(rows,colWidths=[width*f for f in fractions],repeatRows=1 if all(item['header'] for item in block['rows'][0]) else 0,splitByRow=1,splitInRow=1)
        table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor('#d9e3ed')),('ROWBACKGROUNDS',(0,0),(-1,-1),[colors.HexColor('#f1f6fb'),colors.white])]))
        story.extend([table,Spacer(1,7)])
    elif kind=='image':
        source=os.path.join(data['root'],block['src']);iw,ih=ImageReader(source).getSize();scale=min(width/iw,380/ih)
        image=Image(source,width=iw*scale,height=ih*scale)
        caption=Paragraph(clean(block['caption']).replace('&','&amp;'),small)
        story.append(KeepTogether([Spacer(1,5),image,Spacer(1,5),caption,Spacer(1,8)]))

def page(canvas,doc):
    canvas.saveState();canvas.setFont('Manual',7.2);canvas.setFillColor(colors.HexColor('#50657a'))
    canvas.drawString(38,A4[1]-25,'Cuaderno de Bitácora | Manual '+data['version'])
    canvas.drawRightString(A4[0]-38,25,str(doc.page));canvas.restoreState()
doc=SimpleDocTemplate(data['target'],pagesize=A4,rightMargin=38,leftMargin=38,topMargin=42,bottomMargin=40,title='Cuaderno de Bitacora - '+data['version'],author='Lucio J. Martinez',subject='source-sha256:'+data['sourceSha256'],pageCompression=1)
doc.build(story,onFirstPage=page,onLaterPages=page)
