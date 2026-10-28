import styles from './BusinessShowcase.module.css'

const dailyServices = [
  { title: '阶段性学习安排', summary: '不同学习阶段可提供的资料与服务安排说明。' },
  { title: '个别化学习支持', summary: '根据实际学习情况，说明可选择的支持方式。' },
  { title: '晚间课业支持', summary: '作业记录、疑难沟通与日常学习状态说明。' },
  { title: '周末学习支持', summary: '周末时段的学习记录与服务安排介绍。' },
]

const planningServices = [
  { title: '中考信息与升学规划', summary: '整理本地公开升学信息，最终政策以主管部门发布为准。' },
  { title: '高考志愿信息咨询', summary: '基于公开信息提供志愿思路参考，不承诺录取结果。' },
  { title: '单招文化课信息服务', summary: '介绍相关服务内容、适用对象与实际安排。' },
  { title: '考研公共课学习支持', summary: '提供公共课学习与经验信息，具体以实际安排为准。' },
]

function ServiceGroup({ label, services }: { label: string; services: typeof dailyServices }) {
  return (
    <>
      <p className={styles.groupLabel}>{label}</p>
      <div className={styles.serviceGrid}>
        {services.map((service) => (
          <article className={styles.serviceCard} key={service.title}>
            <h3>{service.title}</h3>
            <p>{service.summary}</p>
          </article>
        ))}
      </div>
    </>
  )
}

export function BusinessShowcase() {
  return (
    <section className={styles.section} id="services" aria-labelledby="services-title">
      <div className={styles.heading}>
        <p>服务范围说明</p>
        <h2 id="services-title">把能提供的服务，<br />清楚写在这里</h2>
        <span>以下内容用于说明服务范围，具体项目、对象、时间与收费，以书面服务约定为准。</span>
      </div>

      <ServiceGroup label="日常学习支持" services={dailyServices} />
      <ServiceGroup label="升学规划信息" services={planningServices} />

      <p className={styles.disclaimer}>以下内容用于说明服务范围，不构成招生、录取或学习效果承诺。具体项目、对象、时间、收费与实施，以有效资质、主管部门规定及书面服务约定为准。</p>
    </section>
  )
}
