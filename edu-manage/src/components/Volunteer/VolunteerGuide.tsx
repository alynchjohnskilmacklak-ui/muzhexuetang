'use client'

import { Alert, Card, Steps, Table, Tag, Timeline, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text, Paragraph } = Typography

type ScoreLineRow = {
  key: string
  name: string
  stage: string
  role: string
  target: string
  color: string
}

const scoreLineData: ScoreLineRow[] = [
  {
    key: '1',
    name: '一统线（一次统招线）',
    stage: '录取第一步',
    role: '确定分配生的最低录取资格线',
    target: '全校成绩最顶尖、不占用分配生名额的少数学生',
    color: 'red',
  },
  {
    key: '2',
    name: '二统线（二次统招线/统招线）',
    stage: '录取收尾阶段',
    role: '回收剩余名额，进行第二次统一录取',
    target: '大部分凭中考分数竞争入学的学生',
    color: 'blue',
  },
]

const suggestions = [
  {
    num: '01',
    title: '提前研究目标学校',
    content: '在成绩公布前，提前了解各高中的历年录取分数线（一统线和二统线），结合自身实力制定目标学校梯队。',
  },
  {
    num: '02',
    title: '填报窗口只有2-3天，务必提前做好准备',
    content: '成绩公布到志愿填报截止时间极短，建议成绩出来前就确定好「冲、稳、保」三个梯次的学校选择。',
  },
  {
    num: '03',
    title: '理解分配生政策',
    content: '若就读初中有分配生名额，且成绩在一统线-50分以内，可优先考虑走分配生通道，录取确定性更高。',
  },
  {
    num: '04',
    title: '关注二统线而非一统线',
    content: '对大多数学生来说，二统线才是最终参考标准。一统线是极少数顶尖生源的门槛，切勿将其作为自己的录取参考。',
  },
]

export function VolunteerGuide() {
  const isMobile = useIsMobile() ?? false
  const cardBody = { padding: isMobile ? '14px 16px' : '20px 24px' }

  const scoreLineColumns: ColumnsType<ScoreLineRow> = [
    {
      title: '分数线名称',
      dataIndex: 'name',
      render: (name: string, row) => (
        <Tag color={row.color} style={{ fontSize: 12, padding: '2px 8px', whiteSpace: 'normal' }}>
          {name}
        </Tag>
      ),
    },
    { title: '产生阶段', dataIndex: 'stage', width: 110 },
    { title: '核心作用', dataIndex: 'role' },
    { title: '对应考生', dataIndex: 'target' },
  ]

  return (
    <div style={{ maxWidth: isMobile ? '100%' : 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>石家庄中考志愿填报指南</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          了解石家庄中考流程、分数线政策，助力科学填报志愿
        </Text>
      </div>

      <Card
        title={
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            <CalendarOutlined style={{ marginRight: 8, color: '#E87545' }} />
            石家庄中考整体流程
          </span>
        }
        style={{ marginBottom: 16, borderRadius: 12 }}
        styles={{ body: cardBody }}
      >
        <Alert
          type="info"
          showIcon
          message="石家庄中考采用「先出分，再报志愿，后公布分数线」的流程"
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <Steps
          direction="vertical"
          size="small"
          items={[
            {
              title: (
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  第一步：公布成绩
                  <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>约 7月2日</Tag>
                </span>
              ),
              description: (
                <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.8 }}>
                  石家庄中考文化课考试结束后，成绩通常在考后约七月初对外公布。
                  考生和家长可通过官方渠道查询各科成绩及总分。
                </Text>
              ),
              icon: <FileTextOutlined />,
              status: 'process',
            },
            {
              title: (
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  第二步：填报志愿
                  <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>约 7月3日-7月5日</Tag>
                </span>
              ),
              description: (
                <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.8 }}>
                  志愿填报环节紧接成绩公布进行，填报窗口通常只有 <Text strong>2-3天</Text>。
                  考生需在得知自己成绩后迅速做出志愿选择，务必提前做好学校研究和分数估算。
                </Text>
              ),
              icon: <CheckCircleOutlined />,
              status: 'process',
            },
            {
              title: (
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  第三步：公布分数线
                  <Tag color="green" style={{ marginLeft: 8, fontSize: 11 }}>录取结束后</Tag>
                </span>
              ),
              description: (
                <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.8 }}>
                  在志愿填报结束后，各高中学校根据考生志愿和成绩进行录取，
                  录取完成后统一公布各校录取分数线（一统线、二统线）。
                </Text>
              ),
              icon: <TrophyOutlined />,
              status: 'process',
            },
          ]}
        />
      </Card>

      <Card
        title={
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            <TrophyOutlined style={{ marginRight: 8, color: '#E87545' }} />
            一统线与二统线详解
          </span>
        }
        style={{ marginBottom: 16, borderRadius: 12 }}
        styles={{ body: cardBody }}
      >
        <Alert
          type="warning"
          showIcon
          message="只有省级示范性高中（重点高中）才设一统线和二统线，普通高中只有一个统招线"
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <Table
          dataSource={scoreLineData}
          columns={scoreLineColumns}
          pagination={false}
          size="small"
          style={{ marginBottom: 24 }}
          scroll={{ x: isMobile ? 500 : undefined }}
        />

        <div style={{
          padding: '14px 16px',
          borderRadius: 10,
          backgroundColor: 'rgba(232,117,69,.06)',
          border: '1px solid rgba(232,117,69,.2)',
          marginBottom: 24,
        }}>
          <Text style={{ fontSize: 13, lineHeight: 1.8 }}>
            <Text strong>简单来说：</Text>
            「一统线」是高标准资格线，决定谁能享受分配生政策的照顾；
            「二统线」才是最终面向大众的录取线，是衡量能否被某所高中录取的<Text strong>真正标准</Text>。
          </Text>
        </div>

        <Title level={5} style={{ fontSize: 14, marginBottom: 16 }}>
          省级示范高中完整录取三步流程
        </Title>

        <Timeline
          items={[
            {
              color: '#e03e2d',
              children: (
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 14 }}>第一步：划定「一统线」，锁定顶尖生源</Text>
                  <Paragraph style={{ fontSize: 13, color: '#5a4e3a', marginTop: 6, marginBottom: 0, lineHeight: 1.8 }}>
                    学校拿出约 <Text strong>10%</Text> 的招生名额进行第一次统招。
                    在所有第一志愿填报该校的学生中，按分数从高到低录取，录满为止。
                    <br />
                    <Text type="secondary">最后一名被录取学生的分数 = 一统线</Text>
                  </Paragraph>
                </div>
              ),
            },
            {
              color: '#f5a623',
              children: (
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 14 }}>第二步：录取「分配生」，可能产生剩余名额</Text>
                  <Paragraph style={{ fontSize: 13, color: '#5a4e3a', marginTop: 6, marginBottom: 0, lineHeight: 1.8 }}>
                    学校录取占招生计划大头的分配生，最低分数线为
                    <Text strong>一统线下降50分</Text>，按各初中学校的名额和排名录取。
                    <br />
                    若分配生名额用不完（学生分数不够），空余名额收回进入下一轮。
                  </Paragraph>
                </div>
              ),
            },
            {
              color: '#27a644',
              children: (
                <div>
                  <Text strong style={{ fontSize: 14 }}>第三步：划定「二统线」，完成最终录取</Text>
                  <Paragraph style={{ fontSize: 13, color: '#5a4e3a', marginTop: 6, marginBottom: 0, lineHeight: 1.8 }}>
                    高中将收回的剩余名额再次面向全市所有填报志愿的学生，
                    进行第二次统招，按分数从高到低录满为止。
                    <br />
                    <Text type="secondary">最后一名被录取学生的分数 = 二统线（即通常所说的「统招线」）</Text>
                    <br />
                    对绝大多数不走分配生通道的学生来说，<Text strong>二统线是最终要参考的实际录取分数线。</Text>
                  </Paragraph>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Card
        title={
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            <InfoCircleOutlined style={{ marginRight: 8, color: '#E87545' }} />
            志愿填报建议
          </span>
        }
        style={{ marginBottom: 16, borderRadius: 12 }}
        styles={{ body: cardBody }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map((item) => (
            <div key={item.num} style={{
              display: 'flex',
              gap: 14,
              padding: '14px 16px',
              borderRadius: 10,
              backgroundColor: '#faf8f5',
              border: '1px solid rgba(0,0,0,.06)',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#E87545',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {item.num}
              </div>
              <div>
                <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                  {item.title}
                </Text>
                <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {item.content}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
