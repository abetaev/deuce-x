export type Props = Record<string, unknown>

export type VNode = SyntheticNode | IntrinsicNode
export type Children = VNode | VNode[]

type StatelessNode<TProps extends Props = Props> = {
  type: "stateless"
  create: (props: TProps) => VNode
  props: TProps
  children: VNode[]
}

type StatefulNode<TProps extends Props = Props> = {
  type: "stateful"
  create: (props: TProps) => Iterable<VNode>
  props: TProps
  children: VNode[]
}

export type SyntheticNode<TProps extends Props = Props> = StatelessNode<TProps> | StatefulNode<TProps>

export type IntrinsicNode<TProps extends Props = Props> = {
  type: "intrinsic"
  name: string
  props: TProps
  children: VNode[]
}
